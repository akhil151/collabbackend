import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

const checkBothDatabases = async () => {
  try {
    console.log("\n🔍 CHECKING BOTH DATABASE CONNECTIONS\n")
    
    // Check connection WITH database name
    console.log("1️⃣  Testing WITH database name (collaboration-board):")
    console.log("   URI: mongodb+srv://...@cluster0.q4wrvqv.mongodb.net/collaboration-board")
    await mongoose.connect("mongodb+srv://palanisamyakhil_db_user:akhil123@cluster0.q4wrvqv.mongodb.net/collaboration-board?retryWrites=true&w=majority&appName=Cluster0")
    const withDB = mongoose.connection.db.databaseName
    const collections1 = await mongoose.connection.db.listCollections().toArray()
    const userCount1 = await mongoose.connection.db.collection('users').countDocuments()
    console.log("   ✅ Connected to:", withDB)
    console.log("   📊 Collections:", collections1.map(c => c.name).join(", "))
    console.log("   👤 Users count:", userCount1)
    await mongoose.disconnect()
    
    console.log("\n2️⃣  Testing WITHOUT database name (default):")
    console.log("   URI: mongodb+srv://...@cluster0.q4wrvqv.mongodb.net/")
    await mongoose.connect("mongodb+srv://palanisamyakhil_db_user:akhil123@cluster0.q4wrvqv.mongodb.net/?appName=Cluster0")
    const withoutDB = mongoose.connection.db.databaseName
    const collections2 = await mongoose.connection.db.listCollections().toArray()
    const userCount2 = await mongoose.connection.db.collection('users').countDocuments()
    console.log("   ✅ Connected to:", withoutDB)
    console.log("   📊 Collections:", collections2.map(c => c.name).join(", "))
    console.log("   👤 Users count:", userCount2)
    await mongoose.disconnect()
    
    console.log("\n📋 SUMMARY:")
    console.log(`   Database '${withDB}': ${userCount1} users`)
    console.log(`   Database '${withoutDB}': ${userCount2} users`)
    
    if (userCount2 > 0 && withoutDB !== withDB) {
      console.log("\n⚠️  WARNING: Data exists in BOTH databases!")
      console.log("   Your old server was saving to:", withoutDB)
      console.log("   Your new server should save to:", withDB)
    }
    
    console.log("")
    process.exit(0)

  } catch (error) {
    console.error("❌ Error:", error.message)
    process.exit(1)
  }
}

checkBothDatabases()
