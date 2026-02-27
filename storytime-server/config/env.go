package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("❌ Error loading .env file: ", err)
	}
}

func GetEnv(key string) string {
	value, exists := os.LookupEnv(key)

	if !exists {
		log.Fatalf("❌ Missing environment variable: %s", key)
	}

	if value == "" {
		log.Fatalf("❌ Environment variable %s is defined but empty", key)
	}

	return value
}
