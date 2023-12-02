const express = require('express')
const path = require('path')
const cors = require('cors')
const { spawn } = require('child_process')
const endpoints = require('express-list-endpoints')
const stockfish = spawn('stockfish/stockfish-windows-x86-64-avx2.exe')
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, './build')))

// async query for Stockfish
function getFromStockfish(input, end) {
    return new Promise((resolve, reject) => {
        let data = ''

        const onData = output => {
            data += output.toString().trim()
            if (output.includes(end)) {
                cleanup()
                resolve(data)
            }
        }

        const onError = error => {
            cleanup()
            reject(error)
        }

        const cleanup = () => {
            stockfish.stdout.removeListener('data', onData)
            stockfish.stderr.removeListener('error', onError)
        }

        stockfish.stdout.on('data', onData)
        stockfish.stderr.on('error', onError)

        stockfish.stdin.write(`${input}\n`)
    })
}

// init Stockfish
getFromStockfish('uci', 'uciok')
    .then(() => {
        // console.log('\nStockfish is ready to go!\n')
    })
    .catch(error => {
        // console.log(`Stockfish failed to initialize.\n${error}\n`)
    })

app.get('/play/bestmove', (req, res) => {
    const { fen, elo, depth } = req.query
    // console.log(`got request for /play/bestmove with fen = ${fen}, elo = ${elo}, depth = ${depth}`)
    
    stockfish.stdin.write('setoption name UCI_LimitStrength value true\n')
    stockfish.stdin.write(`setoption name UCI_Elo value ${elo}\n`)

    getFromStockfish('isready', 'readyok')
        .then(() => {
            stockfish.stdin.write(`position fen ${fen}\n`)
            getFromStockfish(`go depth ${depth}`, 'bestmove')
                .then((data) => {
                    let bestmove = data.substring(data.indexOf('bestmove '))
                    bestmove = bestmove.split(" ")[1]
                    res.json({bestmove: bestmove})
                })
        })
})

app.get('/analyze', (req, res) => {
    const { fen, depth, multiPV } = req.query
    // console.log(`got request for /analyze with fen = ${fen}, depth = ${depth}, multiPV = ${multiPV}`)

    stockfish.stdin.write(`setoption name MultiPV value ${multiPV}\n`)

    getFromStockfish('isready', 'readyok')
        .then(() => {
            stockfish.stdin.write(`position fen ${fen}\n`)
            getFromStockfish(`go depth ${depth}`, `bestmove`)
                .then((data) => {
                    let bestLines = []
                    let outputLines = data.split('info depth ')
                    outputLines[outputLines.length-1] = outputLines[outputLines.length-1].split('\n')[0]
                    outputLines.slice(-multiPV).forEach(outputLine => {
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
                    })
                    res.json({bestLines: bestLines})
                })
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
    // console.log(`Server running on port ${port}\n`)
})