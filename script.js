
// ======================================
// STUDYSPACE - PDF UPLOAD
// ======================================

const pdfUpload = document.getElementById("pdfUpload");
const uploadedFile = document.getElementById("uploadedFile");
const chatMessages = document.getElementById("chatMessages");

let uploadedPdfText = "";
async function uploadQuizPdf() {
    const fileInput = document.getElementById("quizPdfUpload");
    const status = document.getElementById("quizPdfStatus");

    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a PDF first.");
        return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    status.textContent = "Uploading PDF...";

    try {
        const response = await fetch("/api/upload-pdf", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Upload failed.");
        }

        const chapterName = prompt("Enter the chapter name:");

        if (!chapterName || !chapterName.trim()) {
            status.textContent = "PDF uploaded, but no chapter was added.";
            return;
        }

        chapters.push({
            name: chapterName.trim(),
            content: data.text,
            unlockedLevel: 1,
            scores: {}
        });

        saveChapters();
        displayChapters();

        status.textContent = "PDF uploaded and chapter added successfully!";

    } catch (error) {
        console.error(error);
        status.textContent = "Upload failed: " + error.message;
    }
}

function addChatMessage(message, sender) {
    const messageDiv = document.createElement("div");

    if (sender === "ai") {
        messageDiv.className = "ai-message";

        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = "✦";

        const content = document.createElement("div");
        content.className = "message-content";

        const heading = document.createElement("strong");
        heading.textContent = "StudySpace AI";

        const paragraph = document.createElement("p");
        paragraph.textContent = message;

        content.appendChild(heading);
        content.appendChild(paragraph);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
    } else {
        messageDiv.className = "user-message";

        const paragraph = document.createElement("p");
        paragraph.textContent = message;
        messageDiv.appendChild(paragraph);
    }

    if (chatMessages) {
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

if (pdfUpload) {
    pdfUpload.addEventListener("change", async function () {
        const file = this.files[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            alert("Please select a PDF file.");
            return;
        }

        uploadedFile.textContent = "Uploading PDF...";

        const formData = new FormData();
        formData.append("pdf", file);

        try {
            const response = await fetch("/api/upload-pdf", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Upload failed");
            }

            uploadedPdfText = data.text;

            uploadedFile.textContent =
                "📄 " + data.fileName + " uploaded successfully!";

            addChatMessage(
                "Your PDF has been uploaded and its text has been extracted.",
                "ai"
            );
        } catch (error) {
            uploadedFile.textContent = "PDF upload failed.";
            console.error(error);
            alert(error.message);
        }
    });
}
// ======================================
// AI STUDY ASSISTANT - SEND MESSAGE
// ======================================

const userQuestion = document.getElementById("userQuestion");
const sendMessage = document.getElementById("sendMessage");
if (sendMessage) {
    sendMessage.addEventListener("click", async function () {

        const question = userQuestion.value.trim();

        if (!question) {
            alert("Please enter a question.");
            return;
        }

        addChatMessage(question, "user");
        userQuestion.value = "";

        sendMessage.disabled = true;

        const thinkingMessage = document.createElement("p");
        thinkingMessage.textContent = "StudySpace AI is thinking...";

        chatMessages.appendChild(thinkingMessage);

        try {
            const response = await fetch("/api/ask-ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: question,
                    documentText: uploadedPdfText
                })
            });

            const data = await response.json();

            thinkingMessage.remove();

            if (!response.ok) {
                throw new Error(data.error || "Something went wrong.");
            }

            addChatMessage(data.answer, "ai");

        } catch (error) {
            thinkingMessage.remove();
            addChatMessage(error.message, "ai");
            console.error(error);

        } finally {
            sendMessage.disabled = false;
        }

    });
}
   

// ======================================
// STUDYSPACE - VIDEO AND AUDIO UPLOAD
// ======================================

const mediaUpload = document.getElementById("mediaUpload");
const mediaFileName = document.getElementById("mediaFileName");
const summarizeMediaBtn = document.getElementById("summarizeMediaBtn");
const mediaSummary = document.getElementById("mediaSummary");
const summaryType = document.getElementById("summaryType");

let selectedMediaFile = null;

if (mediaUpload) {
    mediaUpload.addEventListener("change", function () {
        selectedMediaFile = this.files[0] || null;

        if (mediaFileName) {
            mediaFileName.textContent = selectedMediaFile
                ? "Selected: " + selectedMediaFile.name
                : "No file selected";
        }
    });
}

if (summarizeMediaBtn) {
    summarizeMediaBtn.addEventListener("click", async function () {
        if (!selectedMediaFile) {
            alert("Please select an audio or video file first.");
            return;
        }
        const selectedSummaryType = summaryType.value;

       mediaSummary.textContent = "Uploading and analysing your recording. Please wait...";

        const formData = new FormData();
        formData.append("media", selectedMediaFile);
        formData.append("summaryType", selectedSummaryType);

        summarizeMediaBtn.disabled = true;

        try {
            const response = await fetch("/api/upload-media", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Upload failed");
            }

           mediaSummary.innerHTML = "";

const heading = document.createElement("h3");
heading.textContent = "Your Study Summary";

const file = document.createElement("p");
file.textContent = "File: " + data.fileName;

const result = document.createElement("div");
result.className = "media-result";
result.innerHTML = data.result.replace(/\n/g, "<br>");

mediaSummary.append(heading, file, result);
if (window.MathJax) {
    MathJax.typesetPromise([result]);
}

        } catch (error) {
            mediaSummary.textContent = error.message;
            console.error(error);
        } finally {
            summarizeMediaBtn.disabled = false;
        }
    });
}


// ======================================
// STUDYSPACE - TASK STORAGE
// ======================================

let tasks = [];

try {
    tasks = JSON.parse(
        localStorage.getItem("studySpaceTasks")
    ) || [];
} catch (error) {
    tasks = [];
}

function saveTasks() {
    localStorage.setItem("studySpaceTasks", JSON.stringify(tasks));
}

let currentTaskFilter = "all";


// ======================================
// ADD TASK
// ======================================

function addTask() {
    const taskInput = document.getElementById("taskInput");
    const subjectSelect = document.getElementById("subjectSelect");
    const taskDate = document.getElementById("taskDate");
    const prioritySelect = document.getElementById("taskPriority");

    if (!taskInput || !subjectSelect || !taskDate || !prioritySelect) return;

    const title = taskInput.value.trim();
    const subject = subjectSelect.value;
    const date = taskDate.value;

    if (!title || !subject || !date) {
        alert("Please fill in all fields.");
        return;
    }

    tasks.push({
        title,
        subject,
        date,
        priority: prioritySelect.value,
        completed: false
    });

    saveTasks();
    displayTasks();

    taskInput.value = "";
    subjectSelect.value = "";
    taskDate.value = "";
}


// ======================================
// DISPLAY TASKS
// ======================================

function displayTasks() {
    const taskList = document.getElementById("taskList");
    if (!taskList) return;

    const searchInput = document.getElementById("taskSearch");
    const searchValue = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    taskList.innerHTML = "";

    const totalCount = document.getElementById("totalTaskCount");
    const completedCount = document.getElementById("completedTaskCount");

    if (totalCount) totalCount.textContent = tasks.length;

    if (completedCount) {
        completedCount.textContent =
            tasks.filter(task => task.completed).length;
    }
    // Update Progress Tracker
const progressTotal = document.getElementById("totalTasks");
const progressCompleted = document.getElementById("completedTasks");

if (progressTotal) {
    progressTotal.textContent = tasks.length;
}

if (progressCompleted) {
    progressCompleted.textContent =
        tasks.filter(task => task.completed).length;
}

    const filteredTasks = tasks.filter(task => {
        const matchesFilter =
            currentTaskFilter === "all" ||
            (currentTaskFilter === "pending" && !task.completed) ||
            (currentTaskFilter === "completed" && task.completed);

        const matchesSearch =
            task.title.toLowerCase().includes(searchValue) ||
            task.subject.toLowerCase().includes(searchValue);

        return matchesFilter && matchesSearch;
    });

    if (filteredTasks.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No tasks found.";
        taskList.appendChild(emptyMessage);
    }

    filteredTasks.forEach(task => {
        const index = tasks.indexOf(task);

        const card = document.createElement("div");
        card.className = "task-card";

        const title = document.createElement("h3");
        title.textContent = task.title;

        const details = document.createElement("p");
        details.textContent = task.subject + " | " + task.date;

        const priority = document.createElement("span");
        priority.className = "task-priority";
        priority.textContent = task.priority || "Medium";

        if (task.completed) {
            title.style.textDecoration = "line-through";
            title.style.opacity = "0.5";
        }

        const completeBtn = document.createElement("button");
        completeBtn.textContent = task.completed
            ? "Completed"
            : "Mark Completed";
        completeBtn.disabled = task.completed;

        completeBtn.onclick = function () {
            tasks[index].completed = true;
            saveTasks();
            displayTasks();
        };

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";

        editBtn.onclick = function () {
            const updated = prompt("Enter updated task name:", task.title);

            if (updated && updated.trim()) {
                tasks[index].title = updated.trim();
                saveTasks();
                displayTasks();
            }
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";

        deleteBtn.onclick = function () {
            tasks.splice(index, 1);
            saveTasks();
            displayTasks();
        };

        card.append(priority, title, details, completeBtn, editBtn, deleteBtn);
        taskList.appendChild(card);
    });
}


// ======================================
// FILTER AND SEARCH TASKS
// ======================================

function filterTasks(filter) {
    currentTaskFilter = filter;

    document.querySelectorAll(".task-filters button").forEach(button => {
        button.classList.remove("active");
    });

    const selectedButton = document.querySelector(
        `.task-filters button[onclick="filterTasks('${filter}')"]`
    );

    if (selectedButton) selectedButton.classList.add("active");

    displayTasks();
}

function searchTasks() {
    displayTasks();
}


// ======================================
// LOAD SAVED TASKS
// ======================================

displayTasks();


// ======================================
// STUDYSPACE - CHAPTER QUIZ
// ======================================

let chapters = [];

try {
    chapters = JSON.parse(localStorage.getItem("studySpaceChapters")) || [];
} catch (error) {
    chapters = [];
}

let selectedChapter = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let currentScore = 0;
let currentLevel = 1;
let answered = false;

function saveChapters() {
    localStorage.setItem("studySpaceChapters", JSON.stringify(chapters));
}

function addChapter() {
    const nameInput = document.getElementById("chapterName");
    const contentInput = document.getElementById("chapterContent");

    const name = nameInput.value.trim();
    const content = contentInput.value.trim();

    if (!name || !content) {
        alert("Please enter a chapter name and its content.");
        return;
    }

    chapters.push({
        name,
        content,
        unlockedLevel: 1,
        scores: {}
    });

    saveChapters();
    displayChapters();

    nameInput.value = "";
    contentInput.value = "";

    alert("Chapter added successfully!");
}

function addPdfAsChapter() {
    if (!uploadedPdfText.trim()) {
        alert("Please upload a PDF first.");
        return;
    }

    const name = prompt("Enter the chapter name:");
    if (!name || !name.trim()) return;

    chapters.push({
        name: name.trim(),
        content: uploadedPdfText,
        unlockedLevel: 1,
        scores: {}
    });

    saveChapters();
    displayChapters();
}


function displayChapters() {
    const container = document.getElementById("chapterContainer");
    if (!container) return;

    const searchInput = document.getElementById("chapterSearch");
    const search = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    container.innerHTML = "";

    chapters.forEach((chapter, index) => {
        if (!chapter.name.toLowerCase().includes(search)) return;

        const card = document.createElement("div");
        card.className = "chapter-card";

        const title = document.createElement("h3");
        title.textContent = chapter.name;

        const startButton = document.createElement("button");
        startButton.textContent = "Start Quiz";
        startButton.onclick = () => selectChapter(index);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete Chapter";
        deleteButton.className = "delete-chapter-btn";
        deleteButton.onclick = () => deleteChapter(index);

        card.append(title, startButton, deleteButton);
        container.appendChild(card);
    });

    if (container.innerHTML === "") {
        container.textContent =
            "No chapters found. Add a chapter to begin.";
    }
}

// DELETE A CHAPTER
function deleteChapter(index) {
    const chapter = chapters[index];

    if (!chapter) return;

    const confirmDelete = confirm(
        `Are you sure you want to delete "${chapter.name}"?`
    );

    if (!confirmDelete) return;

    if (selectedChapter === chapter) {
        selectedChapter = null;

        document.getElementById("levelSection").style.display = "none";
        document.getElementById("quizArea").innerHTML = "";
    }

    chapters.splice(index, 1);

    saveChapters();
    displayChapters();
}


function selectChapter(index) {
    selectedChapter = chapters[index];

    if (!selectedChapter) return;

    document.getElementById("selectedChapterName").textContent =
        selectedChapter.name;

    document.getElementById("levelSection").style.display = "block";

    document.getElementById("quizArea").innerHTML =
        "<p>Choose a level to start your quiz.</p>";
}

function startLevel(level) {
    if (!selectedChapter) {
        alert("Please select a chapter first.");
        return;
    }

    if (level > (selectedChapter.unlockedLevel || 1)) {
        alert("Complete the previous level first!");
        return;
    }

    currentLevel = level;
    currentQuestionIndex = 0;
    currentScore = 0;

    const sentences = selectedChapter.content
        .split(/(?<=[.!?])\s+|\n+/)
        .filter(sentence => sentence.trim().length > 25);

    currentQuestions = [];

    sentences.forEach(sentence => {
        const words = sentence.match(/\b[a-zA-Z]{5,}\b/g) || [];
        const uniqueWords = [...new Set(words)];

        if (uniqueWords.length < 2) return;

        const answer = uniqueWords[
            Math.floor(Math.random() * uniqueWords.length)
        ];

        const options = [
            answer,
            ...uniqueWords.filter(word => word !== answer)
        ].slice(0, 4);

        currentQuestions.push({
            question: sentence.replace(
                new RegExp("\\b" + answer + "\\b", "i"),
                "________"
            ),
            answer,
            options: options.sort(() => Math.random() - 0.5)
        });
    });

    currentQuestions = currentQuestions.slice(0, 5);

    if (currentQuestions.length === 0) {
        document.getElementById("quizArea").textContent =
            "Add longer notes with complete sentences to create quiz questions.";
        return;
    }

    showQuestion();
}

function showQuestion() {
    answered = false;

    const area = document.getElementById("quizArea");
    const question = currentQuestions[currentQuestionIndex];

    area.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent =
        `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;

    const questionText = document.createElement("p");
    questionText.textContent = question.question;

    const optionsArea = document.createElement("div");
    optionsArea.id = "quizOptions";

    const feedback = document.createElement("p");
    feedback.id = "quizFeedback";

    const nextButton = document.createElement("button");
    nextButton.id = "nextQuestionBtn";
    nextButton.textContent =
        currentQuestionIndex === currentQuestions.length - 1
            ? "View Results"
            : "Next Question";
    nextButton.hidden = true;
    nextButton.onclick = nextQuestion;

    question.options.forEach(option => {
        const button = document.createElement("button");
        button.textContent = option;
        button.onclick = () => checkAnswer(option);
        optionsArea.appendChild(button);
    });

    area.append(heading, questionText, optionsArea, feedback, nextButton);
}

function checkAnswer(answer) {
    if (answered) return;

    answered = true;

    const question = currentQuestions[currentQuestionIndex];
    const feedback = document.getElementById("quizFeedback");

    if (answer.toLowerCase() === question.answer.toLowerCase()) {
        currentScore++;
        feedback.textContent = "Correct! Well done!";
    } else {
        feedback.textContent = "Incorrect. Correct answer: " + question.answer;
    }

    document.querySelectorAll("#quizOptions button").forEach(button => {
        button.disabled = true;
    });

    document.getElementById("nextQuestionBtn").hidden = false;
}

function nextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    const total = currentQuestions.length;
    const percentage = Math.round((currentScore / total) * 100);

    if (!selectedChapter.scores) {
        selectedChapter.scores = {};
    }

    selectedChapter.scores[currentLevel] = {
        score: currentScore,
        total
    };

    if (percentage >= 60 && currentLevel < 3) {
        selectedChapter.unlockedLevel = Math.max(
            selectedChapter.unlockedLevel || 1,
            currentLevel + 1
        );
    }

    saveChapters();

    const area = document.getElementById("quizArea");
    area.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = "Quiz Completed!";

    const score = document.createElement("h2");
    score.textContent = `${currentScore} / ${total}`;

    const result = document.createElement("p");
    result.textContent = `Your score: ${percentage}%`;

    const message = document.createElement("p");
    message.textContent = percentage >= 60
        ? "Well done! You passed this level."
        : "Keep practising and try again.";

    const retry = document.createElement("button");
    retry.textContent = "Try Again";
    retry.onclick = () => startLevel(currentLevel);

    area.append(heading, score, result, message, retry);

    if (percentage >= 60 && currentLevel < 3) {
        const nextLevel = document.createElement("button");
        nextLevel.textContent = "Start Next Level";
        nextLevel.onclick = () => startLevel(currentLevel + 1);
        area.appendChild(nextLevel);
    }
}

displayChapters();


// ======================================
// STUDYSPACE - PAGE NAVIGATION
// ======================================

const pageIds = [
    "home",
    "subjects",
    "dashboard",
    "notes",
    "media-summarizer",
    "planner",
    "quiz",
    "progress"
];
function showPage(pageId) {
    pageIds.forEach(id => {
        const page = document.getElementById(id);

        if (page) {
            page.classList.toggle("page-hidden", id !== pageId);
        }
    });

    // Show Features only on Home
    const features = document.getElementById("features");

    if (features) {
        features.classList.toggle("page-hidden", pageId !== "home");
    }

    window.scrollTo(0, 0);

    if (pageId === "quiz") {
        displayChapters();
    }

    if (pageId === "planner") {
        displayTasks();
    }
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function(event) {
        const pageId = this.getAttribute("href").substring(1);

        if (pageIds.includes(pageId)) {
            event.preventDefault();
            showPage(pageId);
        }
    });
});

// ======================================
// STUDYSPACE - MANUAL NOTES
// ======================================

let studyNotes = JSON.parse(
    localStorage.getItem("studySpaceNotes")
) || [];

// Save a new note
function saveNote()
 {

    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").value.trim();

    if (title === "" || content === "") {
        alert("Please enter both a title and note content.");
        return;
    }

    const note = {
        id: Date.now(),
        title: title,
        content: content
    };

    studyNotes.push(note);

    localStorage.setItem(
        "studySpaceNotes",
        JSON.stringify(studyNotes)
    );

    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";

    displaySavedNotes();
}

// Display saved notes
function displaySavedNotes() {

    const savedNotes = document.getElementById("savedNotes");

    if (!savedNotes) return;

    savedNotes.innerHTML = "";

    if (studyNotes.length === 0) {
        savedNotes.innerHTML = "<p>No notes saved yet.</p>";
        return;
    }

    studyNotes.forEach(note => {

        const noteCard = document.createElement("div");
        noteCard.className = "saved-note-card";

        const heading = document.createElement("h3");
        heading.textContent = note.title;

        const paragraph = document.createElement("p");
        paragraph.textContent = note.content;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";

        deleteButton.onclick = function () {
            deleteNote(note.id);
        };

        noteCard.appendChild(heading);
        noteCard.appendChild(paragraph);
        noteCard.appendChild(deleteButton);

        savedNotes.appendChild(noteCard);
    });
}

// Delete a note
function deleteNote(id) {

    studyNotes = studyNotes.filter(note => note.id !== id);

    localStorage.setItem(
        "studySpaceNotes",
        JSON.stringify(studyNotes)
    );

    displaySavedNotes();
}

// Load saved notes when website opens
displaySavedNotes();
