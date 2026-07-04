import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentChallenge = null;
let editor;

const challenges = [
    { id: "even", title: "الأعداد الزوجية", desc: "اطبع الأعداد الزوجية من 1 إلى 6 (كل رقم بسطر).", expected: "2\n4\n6\n", points: 15 },
    { id: "hello", title: "مرحبا بالعالم", desc: "اطبع الجملة بدقة: Hello World", expected: "Hello World\n", points: 10 }
];

document.getElementById('guest-enter-btn').onclick = () => {
    signInAnonymously(auth).then(() => {
        document.getElementById('auth-overlay').classList.add('opacity-0', 'pointer-events-none');
    }).catch(err => alert("فشل الدخول كضيف: " + err.message));
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').classList.add('opacity-0', 'pointer-events-none');
        
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        let username;
        if (!userSnap.exists()) {
            const randomId = Math.floor(1000 + Math.random() * 9000);
            username = `💡 Guest_${randomId}`;
            
            await setDoc(userRef, { name: username, points: 0 });
        } else {
            username = userSnap.data().name;
        }
        
        document.getElementById('user-display-name').innerText = username;
        document.getElementById('user-points').innerText = `⭐ ${userSnap.data().points || 0}`;
        
        loadLeaderboard();
    }
});

function loadLeaderboard() {
    const q = query(collection(db, "users"), orderBy("points", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = "";
        let rank = 1;
        snapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement('li');
            li.className = `flex justify-between p-2 rounded ${doc.id === currentUser?.uid ? 'bg-emerald-500/20 border border-emerald-500/40 font-bold' : 'bg-gray-900/40'}`;
            li.innerHTML = `<span>#${rank} ${data.name}</span> <span class="text-amber-400">${data.points} نقطة</span>`;
            leaderboardList.appendChild(li);
            rank++;
        });
    });
}

const challengesList = document.getElementById('challenges-list');
challenges.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = "bg-gray-900 hover:bg-gray-750 text-right p-2.5 rounded border border-gray-800 text-xs flex justify-between items-center transition w-full";
    btn.innerHTML = `<span>${ch.title}</span> <span class="text-amber-400 font-mono">+${ch.points}</span>`;
    btn.onclick = () => {
        currentChallenge = ch;
        const descDiv = document.getElementById('challenge-desc');
        descDiv.classList.remove('hidden');
        descDiv.innerText = ch.desc;
    };
    challengesList.appendChild(btn);
});

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: `# اكتب كود الحل هنا\n`,
        language: 'python',
        theme: 'vs-dark',
        fontSize: 14,
        automaticLayout: true
    });
});

document.getElementById('submit-btn').onclick = async () => {
    if (!currentChallenge) return alert("اختر مسألة أولاً!");
    const outputBox = document.getElementById('output');
    outputBox.innerText = "جاري الفحص والمطابقة البرمجية... 🧪";

    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: document.getElementById('language-select').value,
                version: "*",
                files: [{ content: editor.getValue() }]
            })
        });
        const data = await response.json();
        const studentOutput = data.run.output;

        if (studentOutput.trim().replace(/\r/g, "") === currentChallenge.expected.trim().replace(/\r/g, "")) {
            outputBox.innerText = `✅ رائع! الكود صحيح ومطابق للمخرجات تماماً.\n\nمخرجاتك:\n${studentOutput}`;
            
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { points: increment(currentChallenge.points) });
            
            const freshSnap = await getDoc(userRef);
            document.getElementById('user-points').innerText = `⭐ ${freshSnap.data().points}`;
        } else {
            outputBox.innerText = `❌ المخرجات غير متطابقة.\n\nالمطلوب:\n${currentChallenge.expected}\n\nكودك أخرج:\n${studentOutput}`;
        }
    } catch (err) {
        outputBox.innerText = "خطأ في الاتصال بسيرفر الفحص الذكي.";
    }
};
