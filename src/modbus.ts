import ModbusRTU from 'modbus-serial';

async function connectModbus() {
  const client = new ModbusRTU();

  try {
    await client.connectRTUBuffered('/dev/ttyUSB0', { baudRate: 9600 }); // Connected to serial port
    console.log('Modbus connection success');

    client.setID(1); // set slave ID

    // reading Data : holding register에서 0번부터 125(최대)개의 값 읽기
    const data = await client.readHoldingRegisters(0, 125);
    console.log('Data:', data.data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.close();
  }
}

setInterval(connectModbus, 1000)
