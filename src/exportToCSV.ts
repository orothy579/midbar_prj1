import dotenv from 'dotenv'
dotenv.config()
import pkg from 'pg'
const { Pool } = pkg
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import fs from 'fs/promises'
import path from 'path'

const dbPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
})

const filePath = path.join('./data', 'modbusData.csv')

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
        await fs.writeFile(filePath, header + data, { encoding: 'utf-8' })

        console.log('Exported to', filePath)
    } catch (error) {
        console.error('Export to CSV error:', error)
    }
}

const app = new Hono()

// csv 파일 다운로드
app.get('/', async (c) => {
    try {
        console.log('Exporting to CSV...')
        const result = await exportToCSV()

        const csvFile = await fs.readFile(filePath, { encoding: 'utf-8' })

        c.header('Content-Type', 'text/csv')
        c.header('Content-Disposition', 'attachment; filename=modbusData.csv')
        return c.text(csvFile)
    } catch (err) {
        return c.json({ error: err }, 500)
    }
})

serve(app)
