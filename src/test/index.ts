import ModbusRTU from 'modbus-serial'

const SERIAL_PORT = '/dev/ttyV0' // Master가 사용할 포트
const BAUD_RATE = 9600

const client = new ModbusRTU()

async function initModbus() {
    try {
        await client.connectRTUBuffered(SERIAL_PORT, { baudRate: BAUD_RATE })
        console.log('Modbus Master successed')

        client.setID(1)

        setInterval(async () => {
            try {
                console.log('Sending request to Slave...')
                const data = await client.readHoldingRegisters(0, 10)
                console.log('Slave Response (Parsed):', data.data)
            } catch (err) {
                console.error('Modbus Read Error:', err)
            }
        }, 1000)
    } catch (err) {
        console.error('Modbus Connection Error:', err)
    }
}

initModbus()
