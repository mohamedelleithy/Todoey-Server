import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';
import ngrok from '@ngrok/ngrok';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

// define interfaces for our data
interface Task {
  id: string;
  text: string;
  isDone: boolean;
  userId: string;
}

// Connect to MongoDB
const uri = process.env.MONGODB_URI || '';
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log(err));

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript Express!');
  //getAllTasks();
});

app.post('/register', async (req: Request, res: Response) => {
  // have to hash password before storing in database
  const { email, password } = req.body;
  // check if user exists
  const found = await prisma.users.findFirst({
    where: {
      email: email
    },
  });

  if (found) {
    // user already exists
    res.status(400).send('User already exists!');
  }
  else {
    // hash password and store in database
    const salt = randomBytes(8).toString('hex');
    const hash = scryptSync(password, salt, 32);
    const hashedPassword = hash.toString('hex');
    const newUser = await prisma.users.create({
      data: {
        email: email,
        password: hashedPassword,
        salt: salt
      }
    });
    res.status(200).send('User created!');
  }
});

app.post('/login', async (req: Request, res: Response) => {
  // have to hash password before storing in database
  const { email, password } = req.body;
  // check if user exists
  const found = await prisma.users.findFirst({
    where: {
      email: email
    },
  });

  if (!found) {
    // user does not exist
    res.status(400).send('User does not exist!');
  }
  else {
    // hash password and compare, but get the salt from the database
    const salt = found.salt;
    const hash = scryptSync(password, salt, 32);
    const hashedPassword = hash.toString('hex');

    if (found?.password === hashedPassword) {
      res.status(200);
      res.json(found);
    } else {
      res.status(400).send('Login failed!');
    }
  }
});

app.post('/tasksById', async (req: Request, res: Response) => {
  const { userId } = req.body;
  const allTasks = await prisma.tasks.findMany(
    {
      where: {
        userId: userId
      }
    }
  );
  res.status(200);
  res.json(allTasks);
  
});

app.post('/addTaskById', async (req: Request, res: Response) => {
  const { userId, text } = req.body;
  const newTask = await prisma.tasks.create({
    data: {
      userId: userId,
      text: text,
      isDone: false,
    }
  });
  res.status(200);
  res.json(newTask);
 });

app.put('/toggleTaskStatusById', async (req: Request, res: Response) => {
  const { taskId } = req.body;
  const task = await prisma.tasks.findFirst({
    where: {
      id: taskId
    }
  });
  const updatedTask = await prisma.tasks.update({
    where: {
      id: taskId
    },
    data: {
      isDone: !task?.isDone
    }
  });
  res.status(200);
  res.json(updatedTask);
});

app.delete('/deleteTaskById', async (req: Request, res: Response) => {
  const { taskId } = req.body;
  const deletedTask = await prisma.tasks.delete({
    where: {
      id: taskId
    }
  });
  res.status(200);
  res.json(deletedTask);
});

app.put('/editTaskById', async (req: Request, res: Response) => {
  const { taskId, text } = req.body;
  const updatedTask = await prisma.tasks.update({
    where: {
      id: taskId
    },
    data: {
      text: text
    }
  });
  res.status(200);
  res.json(updatedTask);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);

  
});