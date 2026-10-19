const loginForm = document.querySelector('#login-form');
const operationsButton = document.querySelector('#operations-button');
const formTitle = document.querySelector('#form-title');
const formDescription = document.querySelector('#form-description');
const formNote = document.querySelector('#form-note');
const formMessage = document.querySelector('#form-message');
const submitButton = loginForm.querySelector('button[type="submit"]');

const userContext = {
  title: 'Entrar',
  description: 'Acesse seu painel e acompanhe seus empréstimos.',
  note: 'Cada pessoa vê apenas os próprios empréstimos.',
};

const operationsContext = {
  title: 'Operações',
  description: 'Acompanhe empréstimos abertos, atrasos e itens em manutenção.',
  note: 'Visão operacional de todo o inventário.',
};

const updateContext = (context) => {
  formTitle.textContent = context.title;
  formDescription.textContent = context.description;
  formNote.textContent = context.note;
  formMessage.textContent = '';
};

operationsButton.addEventListener('click', () => {
  updateContext(operationsContext);
  document.querySelector('#email').focus();
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  formMessage.textContent = '';

  const email = loginForm.elements.email.value.trim();
  const password = loginForm.elements.password.value.trim();

  if (!email || !password) {
    formMessage.textContent = 'Informe seu e-mail e sua senha para continuar.';
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Validando...';

  window.setTimeout(() => {
    submitButton.disabled = false;
    submitButton.textContent = 'Entrar';
    formMessage.textContent = 'A autenticação será conectada ao backend nesta etapa.';
  }, 700);
});
