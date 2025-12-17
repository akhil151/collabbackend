import mongoose from "mongoose"

const resetTestDatabase = async () => {
  try {
    console.log("🔌 Connecting to 'test' database...")
    await mongoose.connect("mongodb+srv://palanisamyakhil_db_user:akhil123@cluster0.q4wrvqv.mongodb.net/test?appName=Cluster0")
    console.log("✅ Connected\n")

    const collections = await mongoose.connection.db.collections()
    
    console.log("🗑️  Deleting all data from 'test' database:\n")
    
    let totalDeleted = 0
    for (const collection of collections) {
      const count = await collection.countDocuments()
      const result = await collection.deleteMany({})
      totalDeleted += result.deletedCount
      console.log(`   ✓ ${collection.collectionName}: ${result.deletedCount} documents deleted`)
    }

    console.log(`\n✅ Test database cleaned! Total deleted: ${totalDeleted}`)
    console.log("🎯 Now restart your server and register fresh users\n")

    await mongoose.connection.close()
    process.exit(0)

  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

resetTestDatabase()
