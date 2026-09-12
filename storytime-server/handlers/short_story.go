package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"storytime/config"
	"storytime/db"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Parameters struct {
	Age           string `json:"age" binding:"required"`
	Language      string `json:"language" binding:"required"`
	Genre         string `json:"genre" binding:"required"`
	Tone          string `json:"tone" binding:"required"`
	CharacterName string `json:"characterName" binding:"required"`
	CharacterType string `json:"characterType" binding:"required"`
}

type ShortStory struct {
	Title     string `json:"title"     bson:"title"`
	Beginning string `json:"beginning" bson:"beginning"`
	Middle    string `json:"middle"    bson:"middle"`
	End       string `json:"end"       bson:"end"`
}

type Data struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Parameters `bson:",inline"`
	ShortStory `bson:"shortStory" json:"shortStory"`
	Images     StoryImages `bson:"images" json:"images"`
	CreatedAt  time.Time   `bson:"createdAt" json:"createdAt"`
}

const (
	groqURL        = "https://api.groq.com/openai/v1/chat/completions"
	modelName      = "openai/gpt-oss-120b"
	requestTimeout = 45 * time.Second
)

var httpClient = &http.Client{Timeout: requestTimeout + 5*time.Second}

func CreateSS(c *gin.Context) {
	var p Parameters
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameters!", "detail": err.Error()})
		return
	}

	body, err := json.Marshal(buildPayload(p))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error building request"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqURL, strings.NewReader(string(body)))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating request"})
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.GetEnv("GROQ_API_KEY"))

	res, err := httpClient.Do(req)
	if err != nil {
		status := http.StatusBadGateway
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			status = http.StatusGatewayTimeout
		}
		c.JSON(status, gin.H{"error": "Groq unreachable!", "detail": err.Error()})
		return
	}
	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		detail, _ := io.ReadAll(res.Body)
		log.Printf("⚠️  Groq returned status %s: %s", res.Status, detail)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Groq returned status", "status": res.Status})
		return
	}

	var apiRes struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(res.Body).Decode(&apiRes); err != nil || len(apiRes.Choices) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid Groq response!"})
		return
	}

	story, err := parseStory(apiRes.Choices[0].Message.Content)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	log.Println("story: ", story)
	// images, err := generateImages(ctx, story)
	// if err != nil {
	// 	c.JSON(http.StatusBadGateway, gin.H{"error": "Error generating images", "detail": err.Error()})
	// 	return
	// }
	images, imgErr := generateImages(ctx, story)
	if imgErr != nil {
		log.Printf("⚠️  Error generating images: %v", imgErr)
	}

	doc := Data{
		Parameters: p,
		ShortStory: story,
		Images:     images,
		CreatedAt:  time.Now().UTC(),
	}

	result, err := db.Stories.InsertOne(ctx, doc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error saving story"})
		return
	}

	doc.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, doc)
}

func buildPayload(p Parameters) map[string]any {
	const systemPrompt = `You are a professional children's story writer. Your stories are creative, easy to understand, appropriate for the reader's age, always with a positive tone and a happy ending.

Respond ONLY with a valid JSON object, without any text or explanations before or after, with this exact shape:
{"title": "...", "beginning": "...", "middle": "...", "end": "..."}`

	prompt := fmt.Sprintf(`Write a short story in %s for a %s-year-old child.
The story should be of the %s genre, with a %s tone.
The main character's name is %s and is a(n) %s.`,
		p.Language, p.Age, p.Genre, p.Tone, p.CharacterName, p.CharacterType)

	return map[string]any{
		"model": modelName,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": prompt},
		},
		"temperature":      0.8,
		"max_tokens":       2048,
		"response_format":  map[string]string{"type": "json_object"},
		"reasoning_format": "hidden",
		"reasoning_effort": "low",
	}
}

func parseStory(raw string) (ShortStory, error) {
	var story ShortStory
	if err := json.Unmarshal([]byte(raw), &story); err != nil {
		return ShortStory{}, fmt.Errorf("Invalid story JSON: %w", err)
	}

	story.Title = strings.TrimSpace(story.Title)
	story.Beginning = strings.TrimSpace(story.Beginning)
	story.Middle = strings.TrimSpace(story.Middle)
	story.End = strings.TrimSpace(story.End)

	if story.Title == "" || story.Beginning == "" || story.Middle == "" || story.End == "" {
		return ShortStory{}, errors.New("Story missing required fields")
	}
	return story, nil
}
