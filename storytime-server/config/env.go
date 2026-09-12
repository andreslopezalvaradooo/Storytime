package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  No .env file found, using system environment variables")
	}
}

func GetEnv(key string) string {
	value := os.Getenv(key)

	if value == "" {
		log.Fatalf("❌ Missing or empty environment variable: %s", key)
	}
	
	return value
}
