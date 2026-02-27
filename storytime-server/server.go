package main

import (
	"storytime/config"
	"storytime/db"
	"storytime/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadEnv()
	db.ConnectMongo()
	defer db.DisconnectMongo()

	r := gin.Default()

	frontend := config.GetEnv("FRONTEND_URL")

	r.Use(cors.New(cors.Config{
		AllowHeaders: []string{"Origin", "Content-Type"},
		AllowMethods: []string{"*"},
		AllowOrigins: []string{frontend},
	}))

	r.POST("/api/shortstory", handlers.CreateSS)

	port := config.GetEnv("PORT")
	r.Run(":" + port)
}
