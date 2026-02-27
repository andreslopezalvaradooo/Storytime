package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"storytime/config"
	"storytime/db"
	"strings"
	"time"

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
	CreatedAt  time.Time `bson:"createdAt" json:"createdAt"`
}

var (
	timeout      = 20 * time.Second
	deepInfraURL = "https://api.deepinfra.com/v1/openai/chat/completions"
	httpClient   = &http.Client{Timeout: 25 * time.Second}
	modelName    = "mistralai/Mistral-7B-Instruct-v0.3"
	re           = regexp.MustCompile(`(?s)Title:\s*(.*?)\s*Beginning:\s*(.*?)\s*Middle:\s*(.*?)\s*End:\s*(.*)`)
)

func CreateSS(c *gin.Context) {
	var p Parameters
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parameters!", "detail": err.Error()})
		return
	}

	payload := buildPayload(p)
	body, _ := json.Marshal(payload)

	ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, deepInfraURL, strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.GetEnv("DEEPINFRA_API_KEY"))

	res, err := httpClient.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "DeepInfra unreachable!", "detail": err.Error()})
		return
	}
	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		c.JSON(http.StatusBadGateway, gin.H{"error": "DeepInfra returned status", "status": res.Status})
		return
	}

	var apiRes struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(res.Body).Decode(&apiRes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid deepInfra response!"})
		return
	}

	raw := apiRes.Choices[0].Message.Content
	story, err := parseStory(raw)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	doc := Data{
		Parameters: p,
		ShortStory: story,
		CreatedAt:  time.Now(),
	}

	savedStory, err := db.Stories.InsertOne(ctx, doc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error saving story"})
	}

	doc.ID = savedStory.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, doc)
}

func buildPayload(p Parameters) map[string]any {
	role := `Eres un escritor profesional de cuentos infantiles. Tus historias son creativas, fáciles de entender, apropiadas para la edad del lector, siempre con un tono positivo y un final feliz.

Responde siempre con este formato exacto:

Title: [Escribe solo el título del cuento]
Beginning: [Inicio del cuento: presenta al personaje y el entorno]
Middle: [Desarrollo: plantea la aventura o conflicto]
End: [Desenlace: concluye con una solución positiva]

No agregues explicaciones ni texto fuera de este formato.`

	prompt := fmt.Sprintf(`Escribe un cuento corto en %s para un niño de %s años.
El cuento debe ser del género %s, con un tono %s.
El personaje principal se llama %s y es un(a) %s.`,
		p.Language, p.Age, p.Genre, p.Tone, p.CharacterName, p.CharacterType)

	return map[string]any{
		"model": modelName,
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": role,
			},
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"temperature": 0.8,
		"max_tokens":  1024,
	}
}

func parseStory(raw string) (ShortStory, error) {
	matches := re.FindStringSubmatch(raw)
	if len(matches) != 5 {
		return ShortStory{}, errors.New("story format mismatch")
	}

	return ShortStory{
		Title:     strings.TrimSpace(matches[1]),
		Beginning: strings.TrimSpace(matches[2]),
		Middle:    strings.TrimSpace(matches[3]),
		End:       strings.TrimSpace(matches[4]),
	}, nil
}
