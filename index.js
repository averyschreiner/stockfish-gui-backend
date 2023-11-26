const express = require('express')
const path = require('path')
const cors = require('cors')
const { spawn } = require('child_process')
const endpoints = require('express-list-endpoints')
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, './build')));

app.get('/play/bestmove', (req, res) => {
    const { fen, elo, depth} = req.query
    const stockfish = spawn('stockfish/stockfish-windows-x86-64-avx2.exe')

    // console.log(`got request for /play/bestmove with fen = ${fen}, elo = ${elo}, depth = ${depth}`)

    stockfish.stdin.write('uci\n')

    stockfish.stdout.on('data', (data) => {
        const stockfish_data = data.toString().trim()
        let score = ''
        let bestmove = ''

        // console.log(`------------------------\n${stockfish_data}`)

        if (stockfish_data.includes('uciok')) {
            stockfish.stdin.write('setoption name UCI_LimitStrength value true\n')
            stockfish.stdin.write(`setoption name UCI_Elo value ${elo}\n`)
            stockfish.stdin.write('isready\n')
        }
        if (stockfish_data.includes('readyok')) {
            stockfish.stdin.write(`position fen ${fen}\n`)
            stockfish.stdin.write(`go depth ${depth}\n`)
        }
        if (stockfish_data.includes('bestmove')) {
            bestmove = stockfish_data.substring(stockfish_data.indexOf('bestmove '))
            bestmove = bestmove.split(" ")[1]
            res.json({bestmove: bestmove})
            stockfish.kill()
        }
    })
})

app.get('/analyze', (req, res) => {
    const { fen, depth, multiPV} = req.query
    const stockfish = spawn('stockfish/stockfish-windows-x86-64-avx2.exe')

    // console.log(`got request for /analyze with fen = ${fen}, depth = ${depth}, multiPV = ${multiPV}`)

    stockfish.stdin.write('uci\n')

    stockfish.stdout.on('data', (data) => {
        const stockfish_data = data.toString().trim()
        let bestLines = []

        // console.log(`------------------------\n${stockfish_data}`)

        if (stockfish_data.includes('uciok')) {
            stockfish.stdin.write(`setoption name MultiPV value ${multiPV}\n`)
            stockfish.stdin.write('isready\n')
        }
        if (stockfish_data.includes('readyok')) {
            stockfish.stdin.write(`position fen ${fen}\n`)
            stockfish.stdin.write(`go depth ${depth}\n`)
        }
        if (stockfish_data.includes(`info depth ${depth}`)) {
            let outputLines = stockfish_data.split('\n')
            for (const index in outputLines) {
                let outputLine = outputLines[index]

                if (outputLine.includes('bestmove')) {
                    res.json({bestLines: bestLines})
                    stockfish.kill()
                }
                else {
                    let cp = outputLine.indexOf('cp')
                    let multipv = outputLine.indexOf('multipv')
                    let pv = outputLine.indexOf(' pv ')
                    let lineNum = parseInt(outputLine.substring(multipv + 8, outputLine.indexOf(' ', multipv + 8)))
                    let line = outputLine.substring(pv + 4).split(" ")

                    if (cp == -1) {
                        score = outputLine.substring(outputLine.indexOf('score ') + 6, outputLine.indexOf('score ') + 13)
                    }
                    else {
                        score = parseInt(outputLine.substring(cp + 3, outputLine.indexOf(' ', cp + 3)))
                    }
                    
                    let bestMove = line.shift()
                    let bestLine = {bestMove: bestMove, line: line, score: score}
                    bestLines[lineNum - 1] = bestLine
                }
            }
        }
    })
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './build/index.html'));
})

let routes = endpoints(app)
app.get('/routes', (req, res) => {
    res.json(routes)
})

const port = process.env.PORT || 3001
app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})