import dotenv from 'dotenv'
require('dotenv').config()
import ModbusRTU from 'modbus-serial'
import mqtt from 'mqtt'

const MQTT_BROKER_IP = process.env.MQTT_BROKER_IP || 'localhost'
const MQTT_URL = `mqtt://{MQTT_BROKER_IP}:1883`
const ACCESS_TOKEN = process.env.ACCESS_TOKEN // device access token

const SERIAL_PORT = '/dev/ttyUSB0'
const BAUD_RATE = 9600
const SLAVE_ID = 1
const REGISTER_START = 0
const REGISTER_COUNT = 125

const mqttClient = mqtt.connect(MQTT_URL, {
    username: ACCESS_TOKEN,
})

async function connectModbus() {
    const modbusClient = new ModbusRTU()

    try {
        await modbusClient.connectRTUBuffered(SERIAL_PORT, { baudRate: BAUD_RATE }) // Connected to serial port
        console.log('Modbus connection success')

        modbusClient.setID(SLAVE_ID) // set slave ID

        // reading Data : holding register에서 0번부터 125(최대)개의 값 읽기
        const data = await modbusClient.readHoldingRegisters(REGISTER_START, REGISTER_COUNT)
        console.log("Data:", data.data)

        const payload = JSON.stringify({
            data: data.data,
        })

        mqttClient.publish('v1/devices/me/telemetry', payload, () => {
            console.log(`Published:${payload}`)
        })
    } catch (error) {
        console.error('Error:', error)
    } finally {
        modbusClient.close()
    }
}

setInterval(connectModbus, 1000)

mqttClient.on('connect', () => {
    console.log('connected to thingsboard mqtt')
})

mqttClient.on('error', (err) => {
    console.error('Mqtt error:', err)
})
