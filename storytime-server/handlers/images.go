package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"

	"storytime/config"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

const (
	imageModel       = "@cf/black-forest-labs/flux-1-schnell"
	imageStyleSuffix = "children's book illustration, soft colors, warm lighting, whimsical, no text, no watermark"
)

type StoryImages struct {
	Beginning string `json:"beginning" bson:"beginning"`
	Middle    string `json:"middle"    bson:"middle"`
	End       string `json:"end"       bson:"end"`
}

var (
	cldOnce   sync.Once
	cldClient *cloudinary.Cloudinary
	cldErr    error
)

func getCloudinary() (*cloudinary.Cloudinary, error) {
	cldOnce.Do(func() {
		cldClient, cldErr = cloudinary.NewFromURL(config.GetEnv("CLOUDINARY_URL"))
	})
	return cldClient, cldErr
}

func uploadToCloudinary(ctx context.Context, dataURI string) (string, error) {
	cld, err := getCloudinary()
	if err != nil {
		return "", fmt.Errorf("cloudinary client: %w", err)
	}

	resp, err := cld.Upload.Upload(ctx, dataURI, uploader.UploadParams{
		Folder: "storytime",
	})
	if err != nil {
		return "", fmt.Errorf("cloudinary upload: %w", err)
	}
	if resp.Error.Message != "" {
		return "", fmt.Errorf("cloudinary upload error: %s", resp.Error.Message)
	}

	return resp.SecureURL, nil
}

func cloudflareImagesURL() string {
	return fmt.Sprintf(
		"https://api.cloudflare.com/client/v4/accounts/%s/ai/run/%s",
		config.GetEnv("CLOUDFLARE_ACCOUNT_ID"), imageModel,
	)
}

// buildImagePrompts convierte cada parte del cuento en una frase visual corta
// EN INGLÉS (sin importar el idioma original), para que el modelo de imagen
// nunca reciba texto largo ni en un idioma que maneje mal.
func buildImagePrompts(ctx context.Context, story ShortStory) (StoryImages, error) {
	const instructions = `Convierte cada parte de este cuento infantil en UNA sola frase visual en inglés (máximo 25 palabras), describiendo solo lo que se debe ver en la ilustración (personaje, entorno, acción). No incluyas diálogos ni texto.

Responde ÚNICAMENTE con JSON válido, sin explicaciones, en este formato exacto:
{"beginning":"...","middle":"...","end":"..."}`

	prompt := fmt.Sprintf("Beginning: %s\nMiddle: %s\nEnd: %s", story.Beginning, story.Middle, story.End)

	payload := map[string]any{
		"model": modelName,
		"messages": []map[string]string{
			{"role": "system", "content": instructions},
			{"role": "user", "content": prompt},
		},
		"temperature":      0.4,
		"max_tokens":       700,
		"response_format":  map[string]string{"type": "json_object"}, // JSON mode nativo de Groq
		"reasoning_format": "hidden",                                 // requerido por Groq junto con json_object en modelos de razonamiento
		"reasoning_effort": "low",                                    // tarea simple, no necesita razonamiento profundo
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return StoryImages{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqURL, strings.NewReader(string(body)))
	if err != nil {
		return StoryImages{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.GetEnv("GROQ_API_KEY"))

	res, err := httpClient.Do(req)
	if err != nil {
		return StoryImages{}, fmt.Errorf("Groq unreachable!: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		detail, _ := io.ReadAll(res.Body)
		return StoryImages{}, fmt.Errorf("Groq returned status %s: %s", res.Status, detail)
	}

	var apiRes struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(res.Body).Decode(&apiRes); err != nil || len(apiRes.Choices) == 0 {
		return StoryImages{}, errors.New("invalid groq response")
	}

	var prompts StoryImages
	if err := json.Unmarshal([]byte(apiRes.Choices[0].Message.Content), &prompts); err != nil {
		return StoryImages{}, fmt.Errorf("invalid prompt JSON: %w", err)
	}
	return prompts, nil
}

// generateImages crea las 3 ilustraciones en paralelo.
func generateImages(ctx context.Context, story ShortStory) (StoryImages, error) {
	prompts, err := buildImagePrompts(ctx, story)
	if err != nil {
		return StoryImages{}, fmt.Errorf("building image prompts: %w", err)
	}

	parts := map[string]string{
		"beginning": prompts.Beginning,
		"middle":    prompts.Middle,
		"end":       prompts.End,
	}

	var (
		mu     sync.Mutex
		wg     sync.WaitGroup
		result StoryImages
		errs   []error
	)

	for part, p := range parts {
		wg.Add(1)
		go func(part, prompt string) {
			defer wg.Done()

			img, err := generateImage(ctx, prompt)

			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				errs = append(errs, fmt.Errorf("%s: %w", part, err))
				return
			}
			switch part {
			case "beginning":
				result.Beginning = img
			case "middle":
				result.Middle = img
			case "end":
				result.End = img
			}
		}(part, p)
	}
	wg.Wait()

	if len(errs) > 0 {
		return result, errors.Join(errs...)
	}
	return result, nil
}

func generateImage(ctx context.Context, prompt string) (string, error) {
	payload := map[string]any{
		"prompt": prompt + ", " + imageStyleSuffix,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cloudflareImagesURL(), strings.NewReader(string(body)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.GetEnv("CLOUDFLARE_API_TOKEN"))

	res, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("cloudflare unreachable: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		detail, _ := io.ReadAll(res.Body)
		return "", fmt.Errorf("cloudflare returned status %s: %s", res.Status, detail)
	}

	var apiRes struct {
		Success bool `json:"success"`
		Result  struct {
			Image string `json:"image"`
		} `json:"result"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(res.Body).Decode(&apiRes); err != nil {
		return "", fmt.Errorf("invalid cloudflare response: %w", err)
	}
	if !apiRes.Success || apiRes.Result.Image == "" {
		if len(apiRes.Errors) > 0 {
			return "", fmt.Errorf("cloudflare error: %s", apiRes.Errors[0].Message)
		}
		return "", errors.New("empty cloudflare response")
	}

	if _, err := base64.StdEncoding.DecodeString(apiRes.Result.Image); err != nil {
		return "", fmt.Errorf("invalid base64 payload: %w", err)
	}

	dataURI := "data:image/jpeg;base64," + apiRes.Result.Image

	url, err := uploadToCloudinary(ctx, dataURI)
	if err != nil {
		return "", fmt.Errorf("uploading to cloudinary: %w", err)
	}
	return url, nil
}
