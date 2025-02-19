import time
import random
import threading
from pymodbus.server.async_io import StartSerialServer
from pymodbus.datastore import ModbusSlaveContext, ModbusServerContext
from pymodbus.datastore.store import ModbusSequentialDataBlock

# 1개의 holding register (주소 0) 초기화, 초기값 0
store = ModbusSlaveContext(
    hr=ModbusSequentialDataBlock(0, [0])
)
context = ModbusServerContext(slaves=store, single=True)

def update_registers():
    # 0 ~ 1023 사이의 임의의 정수 생성
    new_value = random.randint(0, 1023)
    # Function Code 3은 holding register를 의미합니다.
    # 단일 register(주소 0)에 [new_value] 리스트 형태로 업데이트합니다.
    context[0].setValues(3, 0, [new_value])
    print("Registers updated:", new_value)

def periodic_update():
    while True:
        update_registers()
        time.sleep(5)  # 5초마다 값 갱신

# 별도의 스레드에서 주기적으로 register 값을 업데이트
threading.Thread(target=periodic_update, daemon=True).start()

# /tmp/ttyV1 포트를 사용하여 Modbus RTU Slave 서버 시작
StartSerialServer(
    context=context,
    port='/dev/ttyV1',
    baudrate=9600,
    stopbits=1,
    bytesize=8,
    parity='N'
)
