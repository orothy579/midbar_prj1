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


const client = mqtt.connect(MQTT_URL, {
  username: ACCESS_TOKEN,
})

let temp = 20

client.on('connect', () => {
  console.log('connected to thingsboard mqtt')
  setInterval(() => {
    temp += 1
    const payload = JSON.stringify({ temp })
    client.publish('v1/devices/me/telemetry', payload, () => {
      console.log(`Published: ${payload}`)
    })
  }, 1000)
})

client.on('error', (err) => {
  console.error('Mqtt error:', err)
})


async function connectModbus() {
  const client = new ModbusRTU()

  try {
    await client.connectRTUBuffered(SERIAL_PORT, { baudRate: BAUD_RATE }) // Connected to serial port
    console.log('Modbus connection success')

    client.setID(1) // set slave ID

    // reading Data : holding register에서 0번부터 125(최대)개의 값 읽기
    const data = await client.readHoldingRegisters(0, 125)
    console.log('Data:', data.data)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    client.close()
  }
}

setInterval(connectModbus, 1000)
