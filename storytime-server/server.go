package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"storytime/config"
	"storytime/db"
	"storytime/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)
	config.LoadEnv()
	db.ConnectMongo()
	defer db.DisconnectMongo()

	r := gin.Default()
	enviroment := config.GetEnv("ENVIRONMENT")

	if enviroment == "local" {
		r.SetTrustedProxies(nil)
	} else {
		r.SetTrustedProxies([]string{"0.0.0.0/0"})
	}

	frontend := config.GetEnv("FRONTEND_URL")

	r.Use(cors.New(cors.Config{
		AllowHeaders: []string{"Origin", "Content-Type"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowOrigins: []string{frontend},
		MaxAge:       12 * time.Hour,
	}))

	r.POST("/api/shortstory", handlers.CreateSS)
	port := config.GetEnv("PORT")

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("❌ Error starting server: ", err)
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal("❌ Forced shutdown: ", err)
	}

	log.Println("🛑 Server stopped successfully.")
}
