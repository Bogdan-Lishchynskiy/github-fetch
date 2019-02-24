const fetch = require('node-fetch');
const _ = require('lodash');
const Table = require('cli-table');
const loader = require('cli-loader')('arrow');
 
// TABLE CONFIG
const tableIns = new Table({
  head: ['id', 'userName', 'comments', 'commits'],
  colWidths: [10, 15, 10, 10]
});

// HELPER FOR GETTING PARAMS FROM COMMAND
function readArgv(param) {
  const index = process
  .argv
  .reduce(
    (acc, el, i) => {
      if (el === `--${param}`)
        acc = i + 1
      return acc
    },
     undefined

    )
 return process.argv[index]
}

// READ COMMAND PARAMS
const TOKEN = readArgv('token')
const REPO = readArgv('repo')

// BUILD FETCH OPTIONS
const fetchOptions = {}
if (TOKEN)
 fetchOptions.headers = { 'Authorization': `token ${TOKEN}` }

// API CALLS
async function getUsersWithComments () {
  try {
    return fetch(`https://api.github.com/repos/${REPO}/comments?per_page=100` , fetchOptions).then(res => res.json())
  } catch (e) {
    loader.stop();
    console.log(`API ERROR: ${e}`)
    process.exit(0)
  }
}

async function mapUserWithCommitsStat() {
   try {
    return fetch(`https://api.github.com/repos/${REPO}/stats/contributors?per_page=100`, fetchOptions).then(res => res.json())
   } catch(e) {
    loader.stop();
    console.log(`API ERROR: ${e}`)
    process.exit(0)
   }
}

// DATA AGGREGATION
function createUserIfNotExist(acc, { id, login }) {
  if (!acc.hasOwnProperty(id))
      acc[id] = { id, userName: login, commentsCount: 0, commitsCount: 0 }
  return acc
}

function aggregateData(usersWithCommits, usersWithComments) {
  return _.orderBy(
      Object.values(
      [...usersWithComments, ...usersWithCommits]
        .reduce(
          (acc, { author, total, user }) => {
            if (author) {
              acc = createUserIfNotExist(acc, author)
              acc[author.id].commitsCount = total
            } else if (user) {
              acc = createUserIfNotExist(acc, user)
              acc[user.id].commentsCount += 1
            }
            return acc
          },
          {}
        )
    ),
    ['commentsCount', 'commitsCount'],
    ['desc', 'desc']
  )
}

// COMMAND
async function grabStatisticCommand() {
  try {
    loader.start();
    let usersWithComments = await getUsersWithComments()
    let usersWithCommits = await mapUserWithCommitsStat()
    loader.stop();

    const sortedUsersWithComments = aggregateData(usersWithComments, usersWithCommits)
      .map(({ id, userName, commitsCount, commentsCount }) => [id, userName, commentsCount, commitsCount])

    tableIns.push(...sortedUsersWithComments)
    console.log(tableIns.toString())
  } catch (e) {
    loader.stop();
    console.log(`Something went wrong: ${e}`)
    process.exit(0)
  }
}

if (!REPO) {
  console.log('You need to provide repo. Example: "--repo anton/test-project --token YOUR_GIT_HUB_TOKEN_HERE"')
  process.exit(0)
}
if (!TOKEN) {
  console.log('WARNING: You do not provide GIT_HUB API TOKEN. You have limit on making request\'s.')
}

grabStatisticCommand()
