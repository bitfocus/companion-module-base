const fs = require('fs')
const path = require('path')

const schema = fs.readFileSync(path.join(__dirname, '../assets/manifest.schema.json'))

fs.writeFileSync(path.join(__dirname, '../generated/manifest-json.js'), `module.exports = ${schema}`)

fs.writeFileSync(path.join(__dirname, '../generated/manifest-json.d.ts'), `const schema: any\nexport default schema`)
