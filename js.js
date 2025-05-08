function loadTodos() {
  const stored = localStorage.getItem("todos");
  return stored ? JSON.parse(stored) : [];
}

function saveTodos(todos) {
  localStorage.setItem("todos", JSON.stringify(todos));
}

const inputEl = document.getElementById("todo-input");
const addBtn = document.getElementById("add-btn");
const todoListEl = document.getElementById("todo-list");

let todos = loadTodos();

function renderTodos() {
  todoListEl.innerHTML = "";
  todos.forEach((todo, index) => {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => {
      todos[index].done = checkbox.checked;
      saveTodos(todos);
      renderTodos();
    });

    const span = document.createElement("span");
    span.textContent = todo.text;
    if (todo.done) {
      span.classList.add("done-text");
    }

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.classList.add("delete-btn");
    delBtn.addEventListener("click", () => {
      todos.splice(index, 1);
      saveTodos(todos);
      renderTodos();
    });

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    todoListEl.appendChild(li);
  });
}

function addTodo() {
  const text = inputEl.value.trim();
  if (text) {
    todos.push({ text: text, done: false });
    saveTodos(todos);
    renderTodos();
    inputEl.value = "";
  }
}

addBtn.addEventListener("click", addTodo);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTodo();
  }
});

renderTodos();
