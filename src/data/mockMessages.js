const STATIONS = ['BJ', 'SH', 'GZ', 'CD', 'WH', 'NJ', 'XA', 'CQ', 'TJ', 'HK']
const PRIORITIES = ['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH']

function pad(n) {
  return String(n).padStart(2, '0')
}

function randomTime(index) {
  const now = new Date()
  const daysAgo = (index - 1) % 35
  const msgDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)
  const year = msgDate.getFullYear()
  const month = pad(msgDate.getMonth() + 1)
  const day = pad(msgDate.getDate())
  const hour = pad((index * 3 + 7) % 24)
  const min = pad((index * 7 + 13) % 60)
  return `${year}-${month}-${day} ${hour}:${min}`
}

const TEMPLATES = [
  (i) =>
    `MSG ${String(i).padStart(4, '0')} FROM ${STATIONS[i % STATIONS.length]} TO ALL\r\nSUBJ: 气象通报\r\n---\r\n今日${8 + (i % 6)}:${pad((i * 11) % 60)} 发布区域天气预报\r\n气温 ${18 + (i % 12)}-${26 + (i % 8)}℃ 风向偏${['东', '南', '西', '北'][i % 4]}\r\n`,
  (i) =>
    `*** ${PRIORITIES[i % PRIORITIES.length]} ***\r\nREF: TEL-${1000 + i}\r\nORIG: ${STATIONS[(i + 2) % STATIONS.length]}\r\nTEXT:\r\n请各站于今日${14 + (i % 4)}:00前完成设备自检\r\n自检项目: 电源/纸带/键盘/回车机构\r\nSTATUS: AWAITING ACK\r\n`,
  (i) =>
    `ZCZC TELEX ${String(8800 + i)}\r\n${randomTime(i)} ${STATIONS[i % STATIONS.length]}\r\n\r\n货物清单编号 HX-${2024000 + i}\r\n件数: ${10 + (i % 90)}  重量: ${(i * 1.3 + 50).toFixed(1)} T\r\n目的地: ${STATIONS[(i + 5) % STATIONS.length]}\r\n\r\nNNNN\r\n`,
  (i) =>
    `FROM: OPERATOR-${(i % 9) + 1}\r\nTO: DISPATCH\r\n\r\n线路${(i % 12) + 1}号中继站信号衰减\r\n当前电平: ${-12 - (i % 8)} dBm\r\n建议切换备用信道 CH-${(i % 16) + 1}\r\n\r\nEND\r\n`,
  (i) =>
    `BULLETIN ${pad(i % 100)}\r\n---\r\n打字测试: ABCDEFG 1234567\r\n中文电传: 中华人民共和国电传通信\r\n特殊符号: @#$%&*()_+-=\r\n回车演示: 第一行\r第二行(\\r覆盖)\r\n换行演示: 行A\r\n行B\r\n`,
  (i) =>
    `CONFIDENTIAL\r\nDTG: ${randomTime(i)}Z\r\n\r\n密级: 内部\r\n内容摘要:\r\n第${i + 1}号调度指令已下达\r\n执行窗口: T+${i % 6}h 至 T+${12 + (i % 12)}h\r\n联络人: OP-${100 + i}\r\n\r\n// END MSG //\r\n`,
]

export function generateMockMessages(count = 30) {
  return Array.from({ length: count }, (_, i) => {
    const template = TEMPLATES[i % TEMPLATES.length]
    const body = template(i + 1)
    const from = STATIONS[i % STATIONS.length]
    const to = STATIONS[(i + 3) % STATIONS.length]
    return {
      id: `msg-${String(i + 1).padStart(3, '0')}`,
      index: i + 1,
      from,
      to,
      priority: PRIORITIES[i % PRIORITIES.length],
      timestamp: randomTime(i),
      preview: body.replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ').slice(0, 48).trim() + '…',
      body,
    }
  })
}

export const MOCK_MESSAGES = generateMockMessages(30)
