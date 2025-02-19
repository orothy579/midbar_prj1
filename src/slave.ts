import { SerialPort } from 'serialport'

// 사용할 시리얼 포트
const SERIAL_PORT = '/dev/ttyV1'
const BAUD_RATE = 9600

// 🔹 SerialPort 인스턴스 생성 (Slave 역할)
const port = new SerialPort({
    path: SERIAL_PORT,
    baudRate: BAUD_RATE,
    parity: 'none',
    stopBits: 1,
    dataBits: 8,
})

// 🔹 초기 Holding Register 값 (Modbus Slave가 반환할 데이터)
const holdingRegisters: number[] = [123, 456, 789, 321, 654]

// 🔹 요청 데이터 수신 감지
port.on('data', (data: Buffer) => {
    console.log('📡 Master Request Received (HEX):', data.toString('hex'))

    // Modbus Request 패킷 분석 (Function Code 03: Read Holding Registers)
    if (data.length >= 6 && data[1] === 0x03) {
        const startAddress = data.readUInt16BE(2) // 요청된 시작 주소
        const quantity = data.readUInt16BE(4) // 요청된 레지스터 개수

        console.log(
            `📌 Master 요청 - Function: 03, Start Address: ${startAddress}, Quantity: ${quantity}`
        )

        // 🔹 요청된 개수만큼 데이터 응답 준비
        const response = Buffer.alloc(3 + quantity * 2 + 2) // 응답 프레임 크기
        response[0] = data[0] // Slave ID
        response[1] = 0x03 // Function Code
        response[2] = quantity * 2 // 데이터 길이

        // 레지스터 데이터 채우기
        for (let i = 0; i < quantity; i++) {
            response.writeUInt16BE(holdingRegisters[startAddress + i] || 0, 3 + i * 2)
        }

        // CRC 계산 (간단한 더미 값, 실제 구현 시 CRC 계산 필요)
        response[response.length - 2] = 0x00
        response[response.length - 1] = 0x00

        // 🔹 Master에게 응답 전송
        port.write(response, () => {
            console.log('🟢 Response Sent (HEX):', response.toString('hex'))
        })
    }
})

console.log(`🚀 Modbus RTU Slave 시작: ${SERIAL_PORT}`)
