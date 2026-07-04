const codeTemplates = {
    python: `print("مرحباً بك في عالم بايثون!")\n\n# اكتب كودك هنا\nfor i in range(5):\n    print(f"الرقم: {i}")`,
    java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("مرحباً بك في عالم جافا!");\n    }\n}`,
    c: `#include <stdio.h>\n\nint main() {\n    printf("مرحباً بك في عالم سي!\\n");\n    return 0;\n}`
};

let editor;

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: codeTemplates.python,
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 16
    });
});

const langSelect = document.getElementById('language-select');
langSelect.addEventListener('change', (e) => {
    const selectedLang = e.target.value;
    
    if (editor) {
        editor.setValue(codeTemplates[selectedLang]);
        let monacoLang = selectedLang === 'c' ? 'c' : selectedLang;
        monaco.editor.setModelLanguage(editor.getModel(), monacoLang);
    }
});

document.getElementById('run-btn').addEventListener('click', async () => {
    const outputElement = document.getElementById('output');
    outputElement.innerText = "جاري تشغيل الكود... ⏳";
    
    const currentLang = langSelect.value;
    const currentCode = editor.getValue();
    
    // ربط مسميات اللغات بـ Piston API
    const apiLangMap = {
        python: { language: 'python', version: '3.10.0' },
        java: { language: 'java', version: '15.0.2' },
        c: { language: 'c', version: '10.2.0' }
    };

    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: apiLangMap[currentLang].language,
                version: apiLangMap[currentLang].version,
                files: [{ content: currentCode }]
            })
        });

        const data = await response.json();
        
        if (data.run) {
            outputElement.innerText = data.run.output || "تم التنفيذ بنجاح (لا توجد مخرجات نصية).";
        } else {
            outputElement.innerText = "حدث خطأ أثناء الاتصال بالسيرفر.";
        }
    } catch (error) {
        outputElement.innerText = "خطأ في الشبكة: تعذر تشغيل الكود.";
        console.error(error);
    }
});
