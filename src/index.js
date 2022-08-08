//const { response } = require('express');
const { response } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());

const customers  = [];

//Middleware
function verifyIfexistsAccountCPF(req,res, next) {
    
    const { cpf } = req.headers; //???

    const customer = customers.find((customer) => customer.cpf === cpf); // find encontra 1 no array e retorna 

    if(!customer) {
        return res.status(400).json({ error: "Customer not found!" })
    }

    req.customer = customer; // deixa o item acessivel para fora do Middleware, através do request

    return next();
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) =>{
        if(operation.type === 'credit') {
            return acc + operation.amount;
        } else {
            return acc - operation.amount;
        }
    },0)
    return balance;
}

app.post('/account', (req, res) =>{

    const { cpf, name } = req.body;
    
    // some irá retornar um booleano, verificando a existencia 
    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    );

    if(customerAlreadyExists) {
        return res.status(400).json({ error: "Customer already exists!" })
    }

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement:[],
});

    return res.status(201).send();

});

//app.use(verifyIfexistsAccountCPF);

//  Podemos utilizar as Middlewres de duas formas, se a informarmos dentro da "ROTA", ela será acessada
//somente pela prórpria "ROTA".
//  Mas se a informamos através de um app.use... estamos fazendo com que todas as "ROTAS" abaixo utilizem 
//aquele middleware.

app.get('/statement', verifyIfexistsAccountCPF, (req, res) => {

    const { customer } = req; // Acessa o item disponibilizado no Req

    //Statement em inglês carrega o siguinificado de extrato
    return res.json(customer.statement);

});

app.post('/deposit', verifyIfexistsAccountCPF, (req, res) => {
    const { description, amount } = req.body;
    
    const { customer } = req;
    
    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit",
    }
    
    customer.statement.push(statementOperation);
    
    return res.status(201).send();
});

app.post('/withdraw', verifyIfexistsAccountCPF, (req,res) => {
    
    const { amount } = req.body;
    const {customer} = req;
    
    const balance = getBalance(customer.statement);
    
    if(balance < amount) {
        res.status(400).json({ error: "Insufficient funds!" })
    }
    
    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit",
    }
    
    customer.statement.push(statementOperation);
    
    return res.status(201).send();
});

app.get('/statement/date', verifyIfexistsAccountCPF, (req, res) => {

    const { customer } = req; 
    const { date } = req.query;

    const dateFormat = new Date(date + " 00:00"); // ANO-MÊS-DIA
    //   dateFormat ajusta um formato da data salva como sendo todas para " 00:00" horas,
    // pegando assim o dia independente da hora, ATENÇÃO ao espaço, 

    const statement = customer.statement.filter(
        (statement) => 
            statement.created_at.toDateString() ===
            new Date(dateFormat).toDateString()
        ); // Se fechar com {} estará definindo como objeto

    //Statement em inglês carrega o siguinificado de extrato
    return res.json(statement);

});


app.put('/account', verifyIfexistsAccountCPF, (req, res) => {

    const { customer } = req; 

    const { name } = req.body;

    customer.name = name;

    return res.status(201).send();
});


app.get('/account', verifyIfexistsAccountCPF, (req, res) => {

    const { customer } = req; 

    return res.json(customer);
});


app.get('/account/all', (req, res) => {
   return res.json(customers);
});


app.delete('/account', verifyIfexistsAccountCPF,(req, res) => {
    
    const { customer } = req;

    customers.splice(customers.indexOf(customer), 1);
    // splice pega um incice e retrira do array quantas possições forem indicadas a partir do incice dado 

    return res.status(200).json(customers);
 });

app.get('/balance', verifyIfexistsAccountCPF, (req,res) => {
    const {customer} = req;

    const balance = getBalance(customer.statement);

    const balanceformated = `R$${balance}`

    return res.json({balance:balanceformated});
});

app.listen(3333);