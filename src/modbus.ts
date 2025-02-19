import dotenv from 'dotenv'
dotenv.config()
import ModbusRTU from 'modbus-serial'
import mqtt from 'mqtt'

const MQTT_BROKER_IP = process.env.MQTT_BROKER_IP || 'localhost'
const MQTT_URL = `mqtt://${MQTT_BROKER_IP}:1883`
const ACCESS_TOKEN = process.env.ACCESS_TOKEN

const SERIAL_PORT = '/dev/ttyUSB0'
const BAUD_RATE = 9600
const SLAVE_ID = 1
const REGISTER_START = 0
const REGISTER_COUNT = 125

// mqttClient 생성
const mqttClient = mqtt.connect(MQTT_URL, {
    username: ACCESS_TOKEN,
})

// Modbus 클라이언트 생성
const modbusClient = new ModbusRTU()

async function initModbus() {
    try {
        if (!modbusClient.isOpen) {
            await modbusClient.connectRTUBuffered(SERIAL_PORT, { baudRate: BAUD_RATE })
            console.log('Modbus connection successed')
            modbusClient.setID(SLAVE_ID)
        }
    } catch (error) {
        console.error('Modbus connection error:', error)
    }
}

async function readModbusData() {
    try {
        if (!modbusClient.isOpen) {
            console.log('Modbus connection lost. Reconnecting...')
            await initModbus()
        }
        // Reading holding register
        const data = await modbusClient.readHoldingRegisters(REGISTER_START, REGISTER_COUNT)
        console.log('Data:', data.data)

        const payload = JSON.stringify({
            data: data.data,
        })

        mqttClient.publish('v1/devices/me/telemetry', payload, () => {
            console.log(`Published: ${payload}`)
        })
    } catch (error) {
        console.error('Error reading modbus data:', error)
    }
}

async function startPolling() {
    await initModbus()
    setInterval(readModbusData, 1000)
}

// master로서 slave 의 data polling 시도
startPolling()

mqttClient.on('connect', () => {
    console.log('Connected to ThingsBoard MQTT')
})

mqttClient.on('error', (err) => {
    console.error('MQTT error:', err)
})
