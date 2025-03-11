import dotenv from 'dotenv'
dotenv.config()
import pkg from 'pg'
import QueryStream = require('pg-query-stream')
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { stream } from 'hono/streaming'
const { Pool } = pkg

const dbPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
})

const app = new Hono()

// api-server
app.get('/', (c) => {
    c.header('Content-Type', 'text/csv')
    c.header('Content-Disposition', 'attachment; filename="Data.csv"')

    return stream(c, async (stream) => {
        const client = await dbPool.connect()
        const query = new QueryStream('SELECT * FROM modbus_data ORDER BY id DESC')
        const result = client.query(query)

        stream.onAbort(() => {
            console.log('Aborted!')
        })

        let isFirstRow = true
        // DB 스트림을 한 행씩 읽으면서 처리
        for await (const row of result) {
            if (isFirstRow) {
                await stream.write(Object.keys(row).join(',') + '\n') //첫째 행이면 헤더 추가
                isFirstRow = false
            }
            await stream.write(Object.values(row).join(',') + '\n')
        }
        client.release()
    })
})

serve(app, { port: 4000 })
