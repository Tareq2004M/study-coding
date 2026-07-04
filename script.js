import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. إعدادات Firebase (ضع بيانات مشروعك هنا)
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
const provider = new GoogleAuthProvider();

// 2. بنك التحديات (قائمة المسائل وحالات الفحص)
const challenges = [
    {
        id: "even_numbers",
        title: "طباعة الأعداد الزوجية",
        description: "اكتب برنامجاً يطبع الأعداد الزوجية من 1 إلى 10، كل رقم في سطر منفصل.",
        expectedOutput: "2\n4\n6\n8\n10\n",
        points: 20
    },
    {
        id: "hello_world",
        title: "الترحيب البرمجي",
        description: "اكتب برنامجاً يطبع جملة 'Hello World' تماماً كما هي.",
        expectedOutput: "Hello World\n",
        points: 10
    }
];

let currentChallenge = null;
let currentUser = null;
let editor;

// 3. بناء لوحة التحديات في الواجهة
const challengesList = document.getElementById('challenges-list');
challenges.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = "bg-gray-800 hover:bg-gray-700 text-right p-3 rounded border border-gray-700 transition flex justify-between items-center";
    btn.innerHTML = `<span>${ch.title}</span> <span class="text-xs text-amber-400">⭐ ${ch.points}</span>`;
    btn.onclick = () => selectChallenge(ch);
    challengesList.appendChild(btn);
});

function selectChallenge(ch) {
    currentChallenge = ch;
    document.getElementById('challenge-description').classList.remove('hidden');
    document.getElementById('challenge-title').innerText = ch.title;
    document.getElementById('challenge-text').innerText = ch.description;
    document.getElementById('output').innerText = "تم اختيار التحدي. اكتب الكود واضغط 'إرسال وفحص الحل'.";
}

// 4. تشغيل محرر Monaco (نفس إعدادات الكود السابق)
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: `# اكتب كود الحل هنا\n`,
        language: 'python',
        theme: 'vs-dark',
        fontSize: 16
    });
});

// [منطق اختيار اللغة وإرسال الكود للـ API يبقى مشابهًا للكود السابق]
// ... (دالة إرسال الكود لـ Piston API للحصول على المخرجات)

// 5. فحص الإجابة ومقارنتها بالمخرجات الصحيحة
document.getElementById('submit-btn').addEventListener('click', async () => {
    if (!currentChallenge) {
        alert("الرجاء اختيار تحدي أولاً من القائمة اليمنى!");
        return;
    }

    const outputElement = document.getElementById('output');
    outputElement.innerText = "جاري فحص الحل عبر السيرفر... 🧪";

    // استدعاء المترجم (Piston API) للحصول على المخرج الفعلي للطالب
    const actualOutput = await executeCodeOnAPI(); 

    // تنظيف المخرجات من المساحات الزائدة والسطور الفارغة للمقارنة العادلة
    const cleanActual = actualOutput.trim().replace(/\r?\n/g, "\n");
    const cleanExpected = currentChallenge.expectedOutput.trim().replace(/\r?\n/g, "\n");

    if (cleanActual === cleanExpected) {
        outputElement.innerHTML = `✅ إجابة صحيحة مبروك!\n\nمخرجاتك:\n${actualOutput}`;
        
        // مكافأة الطالب بالنقاط في Firebase
        if (currentUser) {
            await rewardUser(currentChallenge.points);
        } else {
            outputElement.innerHTML += `\n\n⚠️ تنبيه: لم يتم حفظ النقاط لأنك غير مسجل الدخول.`;
        }
    } else {
        outputElement.innerHTML = `❌ إجابة خاطئة. حاول مجدداً.\n\nالمخرجات المتوقعة:\n${cleanExpected}\n\nمخرجات كودك:\n${cleanActual}`;
    }
});

// 6. إدارة تسجيل الدخول ونظام النقاط السحابي
const authBtn = document.getElementById('auth-btn');
const pointsSpan = document.getElementById('user-points');

authBtn.addEventListener('click', () => {
    if (currentUser) {
        signOut(auth);
    } else {
        signInWithPopup(auth, provider).catch(err => console.error("خطأ بالتسجيل:", err));
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authBtn.innerText = "تسجيل الخروج";
        pointsSpan.classList.remove('hidden');
        
        // جلب أو إنشاء ملف المستخدم في Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            await setDoc(userRef, { name: user.displayName, points: 0 });
            pointsSpan.innerText = `⭐ 0 نقطة`;
        } else {
            pointsSpan.innerText = `⭐ ${userSnap.data().points} نقطة`;
        }
    } else {
        currentUser = null;
        authBtn.innerText = "تسجيل الدخول";
        pointsSpan.classList.add('hidden');
    }
});

async function rewardUser(points) {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
        points: increment(points)
    });
    // تحديث الواجهة فوراً
    const userSnap = await getDoc(userRef);
    pointsSpan.innerText = `⭐ ${userSnap.data().points} نقطة`;
}

// دالة مساعدة لتشغيل الكود (تعتمد على الفيتش من الكود السابق)
async function executeCodeOnAPI() {
    // كود الاتصال بـ Piston API وإرجاع النص المستخرج (data.run.output)
    // ...
}
