const express = require('express')
const cors = require('cors')
const { spawn } = require('child_process')
const app = express()

const corsOptions = {
    origin: 'https://lemon-ocean-032840610.4.azurestaticapps.net/',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.use(express.json())

app.post('/bestmove', (req, res) => {
    const { fen, elo } = req.body
    const depth = 20
    // console.log('$$$$$$ fen is ' + fen + ' $$$$$$')
    // console.log('$$$$$$ elo is ' + elo + ' $$$$$$')
    // console.log('---------------------------------')
    const stockfish = spawn('stockfish/stockfish-windows-x86-64-avx2.exe')

    stockfish.stdout.on('data', (data) => {
        const stockfish_data = data.toString().trim()
        let score = ''
        let bestmove = ''
        // console.log(stockfish_data)
        // console.log('---------------------------------')

        if (stockfish_data.includes('uciok')) {
            stockfish.stdin.write('setoption name UCI_LimitStrength value true\n')
            stockfish.stdin.write(`setoption name UCI_Elo value ${elo}\n`);
            stockfish.stdin.write('isready\n')
        }
        if (stockfish_data.includes('readyok')) {
            stockfish.stdin.write(`position fen ${fen}\n go depth ${depth}\n`)
        }
        if (stockfish_data.includes(`info depth ${depth}`)) {
            cp = stockfish_data.indexOf('cp')
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