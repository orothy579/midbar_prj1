import dotenv from 'dotenv'
dotenv.config()
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const dbPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
})

const filePath = path.join('.', 'modbusData.csv')

async function exportToCSV() {
    try {
        const client = await dbPool.connect()
        const qeury = 'SELECT * FROM modbus_data ORDER BY timestamp DESC'
        const result = await client.query(qeury)
        client.release()

        if (result.rows.length === 0) {
            console.log('No data to export')
            return
        }

        // csv header 생성
        const header = Object.keys(result.rows[0]).join(',') + '\n'

        // csv 데이터 생성
        const data = result.rows.map((row) => Object.values(row).join(',')).join('\n')

        // cvs 파일 생성
        fs.writeFileSync(filePath, header + data, { encoding: 'utf-8' })

        console.log('Exported to', filePath)
    } catch (error) {
        console.error('Export to CSV error:', error)
    }
}

exportToCSV()
