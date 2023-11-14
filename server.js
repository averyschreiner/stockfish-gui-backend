const express = require('express')
const cors = require('cors')
const { spawn } = require('child_process')
const app = express()
app.use(cors())
app.use(express.json())

// for pre-flight ??
// app.options('*', cors())

app.post('/bestmove', (req, res) => {
    const { fen, elo } = req.body
    const depth = 20
    const stockfish = spawn('stockfish/stockfish-windows-x86-64-avx2.exe')

    stockfish.stdout.on('data', (data) => {
        const stockfish_data = data.toString().trim()
        let score = ''
        let bestmove = ''

        if (stockfish_data.includes('uciok')) {
            stockfish.stdin.write('setoption name UCI_LimitStrength value true\n')
            stockfish.stdin.write(`setoption name UCI_Elo value ${elo}\n`);
            stockfish.stdin.write('isready\n')
        }
        if (stockfish_data.includes('readyok')) {
            stockfish.stdin.write(`position fen ${fen}\n go depth ${depth}\n`)
        }
        if (stockfish_data.includes(`info depth ${depth}`)) {
            let cp = stockfish_data.indexOf('cp')
            if (cp == -1) {
                score = stockfish_data.substring(stockfish_data.indexOf('score ') + 6, stockfish_data.indexOf('score ') + 13)
            }
            else {
                score = parseInt(stockfish_data.substring(stockfish_data.indexOf('cp ') + 3, stockfish_data.indexOf(' ', stockfish_data.indexOf('cp ') + 3)))
            }
        }
        if (stockfish_data.includes('bestmove')) {
            bestmove = stockfish_data.substring(stockfish_data.indexOf('bestmove '))
            bestmove = bestmove.split(" ")[1]
            res.json({score: score, bestmove: bestmove})
            stockfish.kill()
        }
    })
    stockfish.stdin.write('uci\n')
})

// const port = 3001
// app.listen(port, () => {
//     console.log(`Server running on port ${port}`)
// })

app.listen(() => {
    console.log('Server is running.')
})