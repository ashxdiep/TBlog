const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Post = require('./models/post');
const User = require ('./models/user');

const app = express();

app.use(bodyParser.json());
app.use('/graphql', graphqlHttp({
  schema: buildSchema(`
      type Post {
        _id: ID!
        title: String!
        type: String!
        description: String!
        date: String!
      }

      type User {
        _id: ID!
        username: String!
        email: String!
        password: String
      }

      input UserInput {
        username: String!
        email: String!
        password: String!
      }

      input PostInput {
        title: String!
        type: String!
        description: String!
        date: String!
      }

      type Query {
        posts: [Post!]!
      }

      type Mutation{
        createPost(eventInput: PostInput): Post
        createUser(userInput: UserInput): User
      }

      schema {
        query: Query
        mutation: Mutation
      }
    `),

  rootValue: {
    posts: () => {
      //putting return Post tells graphql that we're doing something async and not to return anythign too early
      return Post.find()
        .then(posts => {
          return posts.map(post => {
            return { ...post._doc, _id: post.id };
          })
        })
    },
    createPost: args => {
      const post = new Post({
        title: args.eventInput.title,
        type: args.eventInput.type,
        description: args.eventInput.description,
        date: new Date(args.eventInput.date)
      });
      //return first because it is an async operation
      return post
        .save()
        .then(result => {
          console.log(result);
          return { ...result._doc };
        })
        .catch(err => {
        console.log(err);
        throw err;
      })
      return post;
    },
    createUser: args => {
      //making sure there's not an email matching
      return User.findOne({ email: args.userInput.email })
        .then(user => {
          if (user) {
            throw new Error('User exists already');
          }
          return args;
        })
        .then(args => {
          return User.findOne({ username: args.userInput.username })
            .then(user => {
              if (user){
                throw new Error('Username is taken');
              }
              return bcrypt(args.userInput.password, 12);
            })
            .then(hashed => {
              const user = new User({
                username: args.userInput.username,
                email: args.userInput.email,
                password: hashed
              });
              return user.save();
            })
            .then(result => {
              return { ...result._doc, password: null, _id: result.id };
            })
            .catch(err => {
              throw err;
            });
        });
    }
  },
  graphiql: true
}));

mongoose.connect(`mongodb://ashadmin:ashadmin1@ds211265.mlab.com:11265/bloggraphql`);
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.listen(3000, () => {
  console.log('Server on port 3000');
});
