package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"

	"storytime/config"
)

var (
	Client  *mongo.Client
	Stories *mongo.Collection
)

func ConnectMongo() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	uri := config.GetEnv("MONGODB_URI")
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))

	if err != nil {
		log.Fatal("❌ Error connecting to MongoDB Atlas: ", err)
	}

	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		log.Fatal("❌ Ping to MongoDB Atlas failed: ", err)
	}

	Client = client
	Stories = client.Database("storytime").Collection("stories")
	log.Println("✅ MongoDB Atlas connected!")
}

func DisconnectMongo() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := Client.Disconnect(ctx); err != nil {
		log.Println("❌ Error disconnecting from MongoDB: ", err)
		return
	}
	
	log.Println("🛑 MongoDB disconnected!")
}
