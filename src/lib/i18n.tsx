import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Lang = "EN" | "HT" | "FR" | "ES" | "PT" | "AR" | "ZH" | "DE" | "JA" | "RU";

interface LangOption {
  code: Lang;
  label: string;
  flag: string;
}

const LANGUAGES: LangOption[] = [
  { code: "EN", label: "English", flag: "🇺🇸" },
  { code: "HT", label: "Kreyòl", flag: "🇭🇹" },
  { code: "FR", label: "Français", flag: "🇫🇷" },
  { code: "ES", label: "Español", flag: "🇪🇸" },
  { code: "PT", label: "Português", flag: "🇧🇷" },
  { code: "AR", label: "العربية", flag: "🇸🇦" },
  { code: "ZH", label: "中文", flag: "🇨🇳" },
  { code: "DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "JA", label: "日本語", flag: "🇯🇵" },
  { code: "RU", label: "Русский", flag: "🇷🇺" },
];

const VALID_LANGS = LANGUAGES.map(l => l.code);

// Translation type: each key maps to a partial record of Lang → string.
// EN is always present; others fall back to EN.
type Translations = Record<string, Partial<Record<Lang, string>>>;

const translations: Translations = {
  // App
  "app.title": { EN: "Independent Minds", HT: "Independent Minds", FR: "Independent Minds", ES: "Independent Minds", PT: "Independent Minds", AR: "Independent Minds", ZH: "Independent Minds", DE: "Independent Minds", JA: "Independent Minds", RU: "Independent Minds" },
  "app.subtitle": { EN: "Learn Smart. Grow Every Day.", HT: "Aprann Enpòtan. Grandi Chak Jou.", FR: "Apprenez intelligemment. Grandissez chaque jour.", ES: "Aprende inteligente. Crece cada día.", PT: "Aprenda de forma inteligente. Cresça todos os dias.", AR: "تعلم بذكاء. انمُ كل يوم.", ZH: "聪明学习，每天成长。", DE: "Lerne klug. Wachse jeden Tag.", JA: "賢く学ぼう。毎日成長しよう。", RU: "Учись умно. Расти каждый день." },
  "app.version": { EN: "Independent Minds EDU v2.0", HT: "Independent Minds EDU v2.0" },

  // Nav
  "nav.today": { EN: "Today", HT: "Jodi a", FR: "Aujourd'hui", ES: "Hoy", PT: "Hoje", AR: "اليوم", ZH: "今天", DE: "Heute", JA: "今日", RU: "Сегодня" },
  "nav.checkin": { EN: "Check-In", HT: "Tcheke", FR: "Pointage", ES: "Registro", PT: "Check-In", AR: "تسجيل", ZH: "签到", DE: "Check-In", JA: "チェックイン", RU: "Отметка" },
  "nav.badges": { EN: "Badges", HT: "Badj", FR: "Badges", ES: "Insignias", PT: "Insígnias", AR: "شارات", ZH: "徽章", DE: "Abzeichen", JA: "バッジ", RU: "Значки" },
  "nav.library": { EN: "Library", HT: "Bibliyotèk", FR: "Bibliothèque", ES: "Biblioteca", PT: "Biblioteca", AR: "مكتبة", ZH: "图书馆", DE: "Bibliothek", JA: "ライブラリ", RU: "Библиотека" },
  "nav.dadPanel": { EN: "Parent Dashboard", HT: "Tablo Paran", FR: "Tableau de bord parent", ES: "Panel de padres", PT: "Painel dos pais", AR: "لوحة الوالدين", ZH: "家长仪表板", DE: "Eltern-Dashboard", JA: "保護者ダッシュボード", RU: "Панель родителя" },
  "nav.tracks": { EN: "Tracks", HT: "Pis", FR: "Pistes", ES: "Pistas", PT: "Trilhas", AR: "مسارات", ZH: "学习轨道", DE: "Kurse", JA: "トラック", RU: "Треки" },
  "nav.trophies": { EN: "Trophies", HT: "Twofe", FR: "Trophées", ES: "Trofeos", PT: "Troféus", AR: "جوائز", ZH: "奖杯", DE: "Trophäen", JA: "トロフィー", RU: "Трофеи" },
  "nav.settings": { EN: "Settings", HT: "Paramèt", FR: "Paramètres", ES: "Configuración", PT: "Configurações", AR: "إعدادات", ZH: "设置", DE: "Einstellungen", JA: "設定", RU: "Настройки" },
  "nav.alerts": { EN: "Alerts", HT: "Alèt", FR: "Alertes", ES: "Alertas", PT: "Alertas", AR: "تنبيهات", ZH: "提醒", DE: "Warnungen", JA: "アラート", RU: "Оповещения" },
  "nav.progress": { EN: "Today", HT: "Jodi a" },
  "nav.schedule": { EN: "Schedule", HT: "Orè", FR: "Horaire", ES: "Horario", PT: "Agenda", AR: "جدول", ZH: "日程", DE: "Zeitplan", JA: "スケジュール", RU: "Расписание" },
  "nav.feed": { EN: "Feed", HT: "Aktivite", FR: "Activité", ES: "Actividad", PT: "Feed", AR: "النشاط", ZH: "动态", DE: "Feed", JA: "フィード", RU: "Лента" },
  "nav.curriculum": { EN: "Curriculum", HT: "Pwogram", FR: "Programme", ES: "Currículo", PT: "Currículo", AR: "منهج", ZH: "课程", DE: "Lehrplan", JA: "カリキュラム", RU: "Учебный план" },
  "nav.certificates": { EN: "Certificates", HT: "Sètifika", FR: "Certificats", ES: "Certificados", PT: "Certificados", AR: "شهادات", ZH: "证书", DE: "Zertifikate", JA: "証明書", RU: "Сертификаты" },
  "nav.reports": { EN: "Reports", HT: "Rapò", FR: "Rapports", ES: "Informes", PT: "Relatórios", AR: "تقارير", ZH: "报告", DE: "Berichte", JA: "レポート", RU: "Отчёты" },
  "nav.telegram": { EN: "Telegram", HT: "Telegram" },
  "nav.records": { EN: "Records", HT: "Dosye", FR: "Dossiers", ES: "Registros", PT: "Registros", AR: "سجلات", ZH: "记录", DE: "Datensätze", JA: "記録", RU: "Записи" },
  "nav.inbox": { EN: "Inbox", HT: "Bwat mesaj", FR: "Boîte de réception", ES: "Bandeja de entrada", PT: "Caixa de entrada", AR: "صندوق الوارد", ZH: "收件箱", DE: "Posteingang", JA: "受信トレイ", RU: "Входящие" },

  // Status
  "status.planned": { EN: "Planned", HT: "Planifye", FR: "Planifié", ES: "Planificado", PT: "Planejado", AR: "مخطط", ZH: "已计划", DE: "Geplant", JA: "計画済み", RU: "Запланировано" },
  "status.inProgress": { EN: "In Progress", HT: "Ap fèt", FR: "En cours", ES: "En progreso", PT: "Em andamento", AR: "جارٍ", ZH: "进行中", DE: "In Arbeit", JA: "進行中", RU: "В процессе" },
  "status.done": { EN: "Done", HT: "Fini", FR: "Terminé", ES: "Listo", PT: "Feito", AR: "تم", ZH: "完成", DE: "Erledigt", JA: "完了", RU: "Готово" },
  "status.missed": { EN: "Missed", HT: "Manke", FR: "Manqué", ES: "Perdido", PT: "Perdido", AR: "فائت", ZH: "错过", DE: "Verpasst", JA: "欠席", RU: "Пропущено" },

  // Actions
  "action.start": { EN: "Start Block", HT: "Kòmanse Blòk", FR: "Démarrer le bloc", ES: "Iniciar bloque", PT: "Iniciar bloco", AR: "بدء الكتلة", ZH: "开始区块", DE: "Block starten", JA: "ブロック開始", RU: "Начать блок" },
  "action.markDone": { EN: "Mark Done", HT: "Make Fini", FR: "Marquer terminé", ES: "Marcar listo", PT: "Marcar como feito", AR: "وضع علامة تم", ZH: "标记完成", DE: "Als erledigt markieren", JA: "完了にする", RU: "Отметить готовым" },
  "action.save": { EN: "Save", HT: "Sove", FR: "Enregistrer", ES: "Guardar", PT: "Salvar", AR: "حفظ", ZH: "保存", DE: "Speichern", JA: "保存", RU: "Сохранить" },
  "action.cancel": { EN: "Cancel", HT: "Anile", FR: "Annuler", ES: "Cancelar", PT: "Cancelar", AR: "إلغاء", ZH: "取消", DE: "Abbrechen", JA: "キャンセル", RU: "Отмена" },
  "action.add": { EN: "Add", HT: "Ajoute", FR: "Ajouter", ES: "Agregar", PT: "Adicionar", AR: "إضافة", ZH: "添加", DE: "Hinzufügen", JA: "追加", RU: "Добавить" },
  "action.edit": { EN: "Edit", HT: "Modifye", FR: "Modifier", ES: "Editar", PT: "Editar", AR: "تعديل", ZH: "编辑", DE: "Bearbeiten", JA: "編集", RU: "Изменить" },
  "action.delete": { EN: "Delete", HT: "Efase", FR: "Supprimer", ES: "Eliminar", PT: "Excluir", AR: "حذف", ZH: "删除", DE: "Löschen", JA: "削除", RU: "Удалить" },
  "action.undo": { EN: "Undo", HT: "Defèt", FR: "Annuler", ES: "Deshacer", PT: "Desfazer", AR: "تراجع", ZH: "撤销", DE: "Rückgängig", JA: "元に戻す", RU: "Отменить" },
  "action.override": { EN: "Override", HT: "Remèt", FR: "Remplacer", ES: "Anular", PT: "Substituir", AR: "تجاوز", ZH: "覆盖", DE: "Überschreiben", JA: "上書き", RU: "Переопределить" },
  "action.signOut": { EN: "Sign Out", HT: "Dekonekte", FR: "Se déconnecter", ES: "Cerrar sesión", PT: "Sair", AR: "تسجيل خروج", ZH: "退出", DE: "Abmelden", JA: "ログアウト", RU: "Выйти" },
  "action.signIn": { EN: "Sign In", HT: "Konekte", FR: "Se connecter", ES: "Iniciar sesión", PT: "Entrar", AR: "تسجيل دخول", ZH: "登录", DE: "Anmelden", JA: "ログイン", RU: "Войти" },
  "action.signUp": { EN: "Sign Up", HT: "Enskri", FR: "S'inscrire", ES: "Registrarse", PT: "Cadastrar-se", AR: "تسجيل", ZH: "注册", DE: "Registrieren", JA: "サインアップ", RU: "Регистрация" },
  "action.continueWith": { EN: "Continue with", HT: "Kontinye ak", FR: "Continuer avec", ES: "Continuar con", PT: "Continuar com", AR: "متابعة مع", ZH: "继续使用", DE: "Weiter mit", JA: "続行", RU: "Продолжить с" },
  "action.addStudent": { EN: "Add Student", HT: "Ajoute Elèv", FR: "Ajouter un élève", ES: "Agregar estudiante", PT: "Adicionar aluno", AR: "إضافة طالب", ZH: "添加学生", DE: "Schüler hinzufügen", JA: "生徒を追加", RU: "Добавить ученика" },
  "action.selectStudent": { EN: "Select Student", HT: "Chwazi Elèv", FR: "Sélectionner un élève", ES: "Seleccionar estudiante", PT: "Selecionar aluno", AR: "اختيار طالب", ZH: "选择学生", DE: "Schüler auswählen", JA: "生徒を選択", RU: "Выбрать ученика" },

  // Mood & Focus
  "mood.good": { EN: "Good 😊", HT: "Bon 😊" },
  "mood.okay": { EN: "Okay 😐", HT: "Okay 😐" },
  "mood.tired": { EN: "Tired 😴", HT: "Fatige 😴" },
  "focus.high": { EN: "High 🔥", HT: "Wo 🔥" },
  "focus.medium": { EN: "Medium ⚡", HT: "Mwayen ⚡" },
  "focus.low": { EN: "Low 🐢", HT: "Ba 🐢" },

  // Check-in
  "checkin.mood": { EN: "How are you feeling?", HT: "Kijan ou santi ou?", FR: "Comment vous sentez-vous?", ES: "¿Cómo te sientes?", PT: "Como você está?", AR: "كيف تشعر؟", ZH: "你感觉怎么样？", DE: "Wie fühlst du dich?", JA: "気分はどうですか？", RU: "Как ты себя чувствуешь?" },
  "checkin.focus": { EN: "How is your focus?", HT: "Kijan konsantrasyon ou ye?", FR: "Comment est votre concentration?", ES: "¿Cómo es tu concentración?", PT: "Como está seu foco?", AR: "كيف تركيزك؟", ZH: "你的专注力如何？", DE: "Wie ist deine Konzentration?", JA: "集中力はどうですか？", RU: "Как с концентрацией?" },
  "checkin.needHelp": { EN: "Do you need help?", HT: "Èske ou bezwen èd?", FR: "Avez-vous besoin d'aide?", ES: "¿Necesitas ayuda?", PT: "Precisa de ajuda?", AR: "هل تحتاج مساعدة؟", ZH: "你需要帮助吗？", DE: "Brauchst du Hilfe?", JA: "助けが必要ですか？", RU: "Нужна помощь?" },
  "checkin.comment": { EN: "Any comments?", HT: "Kòmantè?", FR: "Des commentaires?", ES: "¿Algún comentario?", PT: "Comentários?", AR: "أي تعليقات؟", ZH: "有什么意见？", DE: "Kommentare?", JA: "コメントは？", RU: "Комментарии?" },
  "checkin.submit": { EN: "Submit Check-In", HT: "Soumèt Tcheke", FR: "Soumettre le pointage", ES: "Enviar registro", PT: "Enviar check-in", AR: "إرسال التسجيل", ZH: "提交签到", DE: "Check-In absenden", JA: "チェックインを送信", RU: "Отправить отметку" },
  "checkin.success": { EN: "Check-in submitted!", HT: "Tcheke soumèt!", FR: "Pointage soumis!", ES: "¡Registro enviado!", PT: "Check-in enviado!", AR: "تم إرسال التسجيل!", ZH: "签到已提交！", DE: "Check-In eingereicht!", JA: "チェックイン送信済み！", RU: "Отметка отправлена!" },

  // Badges
  "badge.champion": { EN: "🏆 Champion of the Week!", HT: "🏆 Chanpyon Semèn nan!" },
  "badge.goldStar": { EN: "⭐ Gold Star!", HT: "⭐ Zetwal Lò!" },
  "badge.keepGoing": { EN: "💪 Keep Going!", HT: "💪 Kontinye!" },
  "badge.newWeek": { EN: "🔄 New Week, New Start!", HT: "🔄 Nouvo Semèn, Nouvo Kòmansman!" },

  // Greetings
  "greeting.morning": { EN: "Good morning", HT: "Bonjou", FR: "Bonjour", ES: "Buenos días", PT: "Bom dia", AR: "صباح الخير", ZH: "早上好", DE: "Guten Morgen", JA: "おはようございます", RU: "Доброе утро" },
  "greeting.afternoon": { EN: "Good afternoon", HT: "Bonswa", FR: "Bon après-midi", ES: "Buenas tardes", PT: "Boa tarde", AR: "مساء الخير", ZH: "下午好", DE: "Guten Nachmittag", JA: "こんにちは", RU: "Добрый день" },
  "greeting.evening": { EN: "Good evening", HT: "Bonswa", FR: "Bonsoir", ES: "Buenas noches", PT: "Boa noite", AR: "مساء الخير", ZH: "晚上好", DE: "Guten Abend", JA: "こんばんは", RU: "Добрый вечер" },

  // Roles
  "role.student": { EN: "Student", HT: "Elèv", FR: "Élève", ES: "Estudiante", PT: "Aluno", AR: "طالب", ZH: "学生", DE: "Schüler", JA: "生徒", RU: "Ученик" },
  "role.parent": { EN: "Parent/Admin", HT: "Paran/Admin", FR: "Parent/Admin", ES: "Padre/Admin", PT: "Pai/Admin", AR: "والد/مسؤول", ZH: "家长/管理员", DE: "Eltern/Admin", JA: "保護者/管理者", RU: "Родитель/Админ" },

  // Yes/No
  "yes": { EN: "Yes", HT: "Wi", FR: "Oui", ES: "Sí", PT: "Sim", AR: "نعم", ZH: "是", DE: "Ja", JA: "はい", RU: "Да" },
  "no": { EN: "No", HT: "Non", FR: "Non", ES: "No", PT: "Não", AR: "لا", ZH: "否", DE: "Nein", JA: "いいえ", RU: "Нет" },

  // Blocks & Scores
  "blocks.done": { EN: "Blocks Done", HT: "Blòk Fini" },
  "rating": { EN: "How did it go? (1-5)", HT: "Kijan sa te ale? (1-5)" },
  "score": { EN: "T4L Score (optional)", HT: "Nòt T4L (opsyonèl)" },
  "notes": { EN: "Notes (optional)", HT: "Nòt (opsyonèl)" },

  // Library
  "library.title": { EN: "Learning Resources", HT: "Resous Aprantisaj" },
  "library.t4l": { EN: "Open Time4Learning", HT: "Louvri Time4Learning" },

  // Auth
  "auth.email": { EN: "Email", HT: "Imèl", FR: "Courriel", ES: "Correo", PT: "E-mail", AR: "بريد إلكتروني", ZH: "电子邮件", DE: "E-Mail", JA: "メール", RU: "Электронная почта" },
  "auth.password": { EN: "Password", HT: "Modpas", FR: "Mot de passe", ES: "Contraseña", PT: "Senha", AR: "كلمة المرور", ZH: "密码", DE: "Passwort", JA: "パスワード", RU: "Пароль" },
  "auth.displayName": { EN: "Display Name", HT: "Non Afichaj", FR: "Nom d'affichage", ES: "Nombre", PT: "Nome de exibição", AR: "اسم العرض", ZH: "显示名称", DE: "Anzeigename", JA: "表示名", RU: "Отображаемое имя" },
  "auth.signingIn": { EN: "Signing in...", HT: "Ap konekte..." },
  "auth.creatingAccount": { EN: "Creating account...", HT: "Ap kreye kont..." },
  "auth.noAccount": { EN: "Don't have an account?", HT: "Ou pa gen kont?" },
  "auth.hasAccount": { EN: "Already have an account?", HT: "Ou gen kont deja?" },
  "auth.orContinueWith": { EN: "Or continue with", HT: "Oubyen kontinye ak" },
  "auth.checkEmail": { EN: "Check your email to confirm your account!", HT: "Tcheke imèl ou pou konfime kont ou!" },
  "auth.forgotPassword": { EN: "Forgot Password?", HT: "Bliye Modpas?" },
  "auth.forgotPasswordDesc": { EN: "Enter your email and we'll send you a reset link.", HT: "Antre imèl ou epi n ap voye yon lyen pou reyinisyalize." },
  "auth.sendResetLink": { EN: "Send Reset Link", HT: "Voye Lyen Reyinisyalize" },
  "auth.sending": { EN: "Sending...", HT: "Ap voye..." },
  "auth.checkYourEmail": { EN: "Check Your Email", HT: "Tcheke Imèl Ou" },
  "auth.resetEmailSent": { EN: "We've sent a password reset link to your email.", HT: "Nou voye yon lyen reyinisyalize modpas nan imèl ou." },
  "auth.backToLogin": { EN: "Back to Login", HT: "Retounen nan Koneksyon" },
  "auth.setNewPassword": { EN: "Set New Password", HT: "Mete Nouvo Modpas" },
  "auth.newPassword": { EN: "New Password", HT: "Nouvo Modpas" },
  "auth.confirmPassword": { EN: "Confirm Password", HT: "Konfime Modpas" },
  "auth.updatePassword": { EN: "Update Password", HT: "Mete Modpas Ajou" },
  "auth.updating": { EN: "Updating...", HT: "Ap mete ajou..." },
  "auth.passwordUpdated": { EN: "Password updated successfully!", HT: "Modpas mete ajou avèk siksè!" },
  "auth.passwordMismatch": { EN: "Passwords do not match", HT: "Modpas yo pa menm" },
  "auth.passwordTooShort": { EN: "Password must be at least 6 characters", HT: "Modpas dwe gen omwen 6 karaktè" },
  "auth.invalidResetLink": { EN: "Invalid Reset Link", HT: "Lyen Reyinisyalize Envalid" },
  "auth.invalidResetDesc": { EN: "This link is invalid or has expired. Please request a new one.", HT: "Lyen sa a envalid oswa li ekspire. Tanpri mande yon nouvo." },

  // Welcome Modal
  "welcome.title": { EN: "Welcome to Independent Minds! 🎓", HT: "Byenvini nan Independent Minds! 🎓" },
  "welcome.subtitle": { EN: "Let's set up your learning environment.", HT: "Ann konfigire anviwònman aprantisaj ou." },
  "welcome.addFirst": { EN: "Start by adding your first student", HT: "Kòmanse pa ajoute premye elèv ou" },
  "welcome.getStarted": { EN: "Get Started", HT: "Kòmanse" },

  // Student management
  "student.name": { EN: "Student Name", HT: "Non Elèv" },
  "student.id": { EN: "Student ID", HT: "ID Elèv" },
  "student.grade": { EN: "Grade Level", HT: "Nivo Klas" },
  "student.noStudents": { EN: "No students yet", HT: "Pa gen elèv ankò" },
  "student.addDescription": { EN: "Add your first student to get started!", HT: "Ajoute premye elèv ou pou kòmanse!" },
  "student.created": { EN: "Student added with default tracks!", HT: "Elèv ajoute ak pis pa defo!" },

  // Tracks
  "tracks.title": { EN: "Learning Tracks", HT: "Pis Aprantisaj" },
  "tracks.addTrack": { EN: "Add Track", HT: "Ajoute Pis" },
  "tracks.editTrack": { EN: "Edit Track", HT: "Modifye Pis" },
  "tracks.newTrack": { EN: "New Learning Track", HT: "Nouvo Pis Aprantisaj" },
  "tracks.name": { EN: "Track Name", HT: "Non Pis" },
  "tracks.category": { EN: "Category", HT: "Kategori" },
  "tracks.dailyTarget": { EN: "Daily Target", HT: "Objektif Chak Jou" },
  "tracks.unitType": { EN: "Unit Type", HT: "Tip Inite" },
  "tracks.icon": { EN: "Icon", HT: "Ikòn" },
  "tracks.color": { EN: "Color", HT: "Koulè" },
  "tracks.noTracks": { EN: "No learning tracks set up yet", HT: "Pa gen pis aprantisaj ankò" },
  "tracks.askParent": { EN: "Ask your parent to configure your learning tracks!", HT: "Mande paran ou pou konfigire pis aprantisaj ou!" },
  "tracks.today": { EN: "today", HT: "jodi a" },

  // Activity Feed
  "feed.title": { EN: "Today's Activity Feed", HT: "Aktivite Jodi a" },
  "feed.noActivity": { EN: "No activities logged today", HT: "Pa gen aktivite jodi a" },
  "feed.overrideTitle": { EN: "Override Activity", HT: "Korije Aktivite" },

  // Telegram
  "telegram.title": { EN: "Telegram Notifications", HT: "Notifikasyon Telegram" },
  "telegram.active": { EN: "Active", HT: "Aktif" },
  "telegram.configure": { EN: "Configure Telegram", HT: "Konfigire Telegram" },
  "telegram.botToken": { EN: "Bot Token", HT: "Token Bot" },
  "telegram.chatId": { EN: "Chat ID", HT: "ID Chat" },
  "telegram.saved": { EN: "Telegram settings saved!", HT: "Paramèt Telegram sove!" },
  "telegram.test": { EN: "Test Connection", HT: "Teste Koneksyon" },
  "telegram.testSuccess": { EN: "Test message sent!", HT: "Mesaj tès voye!" },

  // Onboarding categories
  "cat.coreAcademics": { EN: "Core Academics", HT: "Akademik Prensipal" },
  "cat.languageLab": { EN: "Language Lab", HT: "Lab Lang" },
  "cat.techSkills": { EN: "Tech Skills", HT: "Konpetans Teknik" },
  "cat.creativeArts": { EN: "Creative Arts", HT: "A Kreyatif" },
  "cat.physicalEd": { EN: "Physical Ed", HT: "Edikasyon Fizik" },

  // Schedule
  "schedule.addBlock": { EN: "Add Block", HT: "Ajoute Blòk" },
  "schedule.editBlock": { EN: "Edit Block", HT: "Modifye Blòk" },
  "schedule.bulkUpload": { EN: "Bulk Upload", HT: "Chaje an Mas" },
  "schedule.noBlocks": { EN: "No blocks scheduled for today", HT: "Pa gen blòk pou jodi a" },
  "schedule.date": { EN: "Date", HT: "Dat" },
  "schedule.start": { EN: "Start", HT: "Kòmansman" },
  "schedule.end": { EN: "End", HT: "Fen" },
  "schedule.subject": { EN: "Subject", HT: "Matyè" },
  "schedule.blockOrder": { EN: "Block Order", HT: "Lòd Blòk" },

  // Misc
  "loading": { EN: "Loading...", HT: "Ap chaje...", FR: "Chargement...", ES: "Cargando...", PT: "Carregando...", AR: "جارٍ التحميل...", ZH: "加载中...", DE: "Laden...", JA: "読み込み中...", RU: "Загрузка..." },
  "noAlerts": { EN: "No alerts", HT: "Pa gen alèt" },
  "helpNeeded": { EN: "Help Needed", HT: "Bezwen Èd" },
  "done": { EN: "Done", HT: "Fini" },
  "remaining": { EN: "Remaining", HT: "Rete" },
  "complete": { EN: "Complete", HT: "Konplè" },
  "thisWeek": { EN: "This Week", HT: "Semèn sa a" },
  "streak": { EN: "Streak", HT: "Seri" },

  // Signup
  "signup.adultConfirmation": { EN: "I confirm I am 18 years of age or older and am the parent or legal guardian of the students I will manage on this platform.", HT: "Mwen konfime ke mwen gen 18 an oswa plis epi mwen se paran oswa gadyen legal elèv yo ke mwen pral jere sou platfòm sa a." },

  // Privacy & Terms
  "privacy.title": { EN: "Privacy Policy", HT: "Politik Konfidansyalite" },
  "terms.title": { EN: "Terms of Service", HT: "Kondisyon Sèvis" },

  // Profile
  "profile.deleteAccount": { EN: "Delete My Account", HT: "Efase Kont Mwen" },
  "profile.deleteAccountConfirm": { EN: "Type DELETE to confirm", HT: "Tape DELETE pou konfime" },

  // Offline
  "offline.indicator": { EN: "You are offline", HT: "Ou pa gen entènèt" },
  "offline.savedLocally": { EN: "Saved locally", HT: "Sove lokalman" },
  "offline.willSync": { EN: "Will sync when reconnected", HT: "Ap senkronize lè ou rekonekte" },
  "offline.actionsQueued": { EN: "actions queued", HT: "aksyon nan keu" },

  // Onboarding
  "onboarding.stepOf": { EN: "Step {current} of {total}", HT: "Etap {current} nan {total}" },
  "onboarding.step.welcome": { EN: "Welcome", HT: "Byenvini" },
  "onboarding.step.verify": { EN: "Verify Email", HT: "Verifye Imèl" },
  "onboarding.step.addStudent": { EN: "Add Student", HT: "Ajoute Elèv" },
  "onboarding.step.configureTracks": { EN: "Set Up Subjects", HT: "Konfigire Matyè" },
  "onboarding.step.notifications": { EN: "Notifications", HT: "Notifikasyon" },
  "onboarding.skipForNow": { EN: "Set up later", HT: "Konfigire pita" },
  "dashboard.notificationIncomplete": { EN: "Notifications not set up yet", HT: "Notifikasyon pa konfigire ankò" },
  "dashboard.setupNow": { EN: "Set up now", HT: "Konfigire kounye a" },

  // Rewards suggestions
  "rewards.suggestions.movieNight": { EN: "Movie Night", HT: "Sware Fim" },
  "rewards.suggestions.screenTime": { EN: "Extra Screen Time", HT: "Tan Ekran Anplis" },
  "rewards.suggestions.iceCream": { EN: "Ice Cream Trip", HT: "Ale Pran Krèm" },
  "rewards.suggestions.stayUpLate": { EN: "Stay Up Late", HT: "Rete Leve Ta" },
  "rewards.suggestions.chooseDinner": { EN: "Choose Dinner", HT: "Chwazi Dine" },
  "rewards.suggestions.extraGameTime": { EN: "Extra Game Time", HT: "Tan Jwèt Anplis" },
  "rewards.suggestions.dayTrip": { EN: "Day Trip", HT: "Pwomnad Jounen" },
  "rewards.suggestions.newBook": { EN: "New Book", HT: "Nouvo Liv" },
  "rewards.suggestions.sent": { EN: "Suggestion sent to parent!", HT: "Sijesyon voye bay paran!" },
  "rewards.empty.inspirationTitle": { EN: "Reward Ideas 💡", HT: "Ide Rekonpans 💡" },

  // Accessibility
  "a11y.skipToContent": { EN: "Skip to main content", HT: "Ale nan kontni prensipal" },
  "a11y.statsBar": { EN: "Student statistics", HT: "Estatistik elèv" },
  "a11y.studentPhoto": { EN: "Photo of", HT: "Foto de" },
  "a11y.defaultAvatar": { EN: "Default student avatar", HT: "Avatar elèv pa defo" },

  // Notification settings
  "settings.notifications.title": { EN: "Notification Settings", HT: "Paramèt Notifikasyon" },
  "settings.whatsapp.enable": { EN: "Enable WhatsApp", HT: "Aktive WhatsApp" },
  "settings.whatsapp.number": { EN: "WhatsApp Number", HT: "Nimewo WhatsApp" },
  "settings.whatsapp.invalidFormat": { EN: "Invalid WhatsApp number format", HT: "Fòma nimewo WhatsApp envalid" },
  "settings.channel.telegram": { EN: "Telegram", HT: "Telegram" },
  "settings.channel.whatsapp": { EN: "WhatsApp", HT: "WhatsApp" },
  "settings.channel.both": { EN: "Both", HT: "Tou de" },

  // AI
  "ai.rateLimitExceeded": { EN: "Hourly limit reached for Mr A", HT: "Limit èdtan rive pou Mr A" },
  "ai.rateLimitReset": { EN: "Resets at", HT: "Reyinisyalize a" },
  "ai.clearHistory": { EN: "Clear History", HT: "Efase Istwa" },
  "ai.clearHistoryConfirm": { EN: "Clear all conversation history?", HT: "Efase tout istwa konvèsasyon?" },

  // MFA
  "mfa.enable": { EN: "Enable Two-Factor Authentication", HT: "Aktive Otantifikasyon De Faktè" },
  "mfa.description": { EN: "Add an extra layer of security to your account", HT: "Ajoute yon kouch sekirite anplis nan kont ou" },
  "mfa.scanQR": { EN: "Scan this QR code with your authenticator app", HT: "Eskanye kòd QR sa a ak aplikasyon otantifikatè ou" },
  "mfa.enterCode": { EN: "Enter the 6-digit code", HT: "Antre kòd 6 chif la" },
  "mfa.enabled": { EN: "Two-factor authentication is enabled", HT: "Otantifikasyon de faktè aktive" },
  "mfa.protected": { EN: "Account Protected", HT: "Kont Pwoteje" },
  "mfa.disable": { EN: "Disable MFA", HT: "Dezaktive MFA" },

  // Block actions
  "block.start": { EN: "Start Block", HT: "Kòmanse Blòk" },
  "block.markDone": { EN: "Mark Done", HT: "Make Fini" },

  // Nav
  "nav.openMenu": { EN: "Open menu", HT: "Louvri meni" },

  // ── Guardians ──
  "guardians.title": {
    EN: "Co-Guardians", HT: "Ko-gadyen", FR: "Co-tuteurs", ES: "Co-tutores",
    PT: "Co-responsáveis", AR: "أولياء مشاركون", ZH: "共同监护人",
    DE: "Mit-Erziehungsberechtigte", JA: "共同保護者", RU: "Со-опекуны",
  },
  "guardians.add": {
    EN: "Invite Co-Guardian", HT: "Envite yon ko-gadyen", FR: "Inviter un co-tuteur", ES: "Invitar co-tutor",
    PT: "Convidar co-responsável", AR: "دعوة ولي مشارك", ZH: "邀请共同监护人",
    DE: "Mit-Erziehungsberechtigten einladen", JA: "共同保護者を招待", RU: "Пригласить со-опекуна",
  },
  "guardians.invite_sent": {
    EN: "Invite sent", HT: "Envitasyon voye", FR: "Invitation envoyée", ES: "Invitación enviada",
    PT: "Convite enviado", AR: "تم إرسال الدعوة", ZH: "邀请已发送",
    DE: "Einladung gesendet", JA: "招待を送信しました", RU: "Приглашение отправлено",
  },
  "guardians.invite_placeholder": {
    EN: "Enter their email address", HT: "Antre adrès imèl yo", FR: "Entrez leur adresse courriel", ES: "Ingresa su correo electrónico",
    PT: "Digite o e-mail", AR: "أدخل عنوان بريدهم", ZH: "输入邮箱地址",
    DE: "E-Mail-Adresse eingeben", JA: "メールアドレスを入力", RU: "Введите email",
  },
  "guardians.send_invite": {
    EN: "Send Invite", HT: "Voye envitasyon", FR: "Envoyer l'invitation", ES: "Enviar invitación",
    PT: "Enviar convite", AR: "إرسال الدعوة", ZH: "发送邀请",
    DE: "Einladung senden", JA: "招待を送信", RU: "Отправить приглашение",
  },
  "guardians.pending": {
    EN: "Pending", HT: "Annatant", FR: "En attente", ES: "Pendiente",
    PT: "Pendente", AR: "معلّق", ZH: "待处理",
    DE: "Ausstehend", JA: "保留中", RU: "Ожидает",
  },
  "guardians.active": {
    EN: "Active", HT: "Aktif", FR: "Actif", ES: "Activo",
    PT: "Ativo", AR: "نشط", ZH: "活跃",
    DE: "Aktiv", JA: "有効", RU: "Активный",
  },
  "guardians.revoke": {
    EN: "Revoke access", HT: "Retire aksè", FR: "Révoquer l'accès", ES: "Revocar acceso",
    PT: "Revogar acesso", AR: "إلغاء الوصول", ZH: "撤销访问",
    DE: "Zugriff widerrufen", JA: "アクセスを取り消す", RU: "Отозвать доступ",
  },
  "guardians.permissions": {
    EN: "Permissions", HT: "Pèmisyon", FR: "Permissions", ES: "Permisos",
    PT: "Permissões", AR: "الأذونات", ZH: "权限",
    DE: "Berechtigungen", JA: "権限", RU: "Разрешения",
  },
  "guardians.view_progress": {
    EN: "View student progress", HT: "Wè pwogrè elèv", FR: "Voir la progression", ES: "Ver progreso",
    PT: "Ver progresso", AR: "عرض تقدم الطالب", ZH: "查看学生进度",
    DE: "Fortschritt anzeigen", JA: "生徒の進捗を見る", RU: "Просмотр прогресса",
  },
  "guardians.receive_sos": {
    EN: "Receive SOS alerts", HT: "Resevwa alèt SOS", FR: "Recevoir les alertes SOS", ES: "Recibir alertas SOS",
    PT: "Receber alertas SOS", AR: "استقبال تنبيهات SOS", ZH: "接收SOS警报",
    DE: "SOS-Alarme empfangen", JA: "SOSアラートを受信", RU: "Получать SOS-оповещения",
  },
  "guardians.approve_rewards": {
    EN: "Approve & deny rewards", HT: "Apwouve rekonpans", FR: "Approuver les récompenses", ES: "Aprobar recompensas",
    PT: "Aprovar recompensas", AR: "الموافقة على المكافآت", ZH: "审批奖励",
    DE: "Belohnungen genehmigen", JA: "報酬を承認", RU: "Одобрять награды",
  },
  "guardians.edit_lessons": {
    EN: "Add & edit lessons", HT: "Ajoute ak modifye leson", FR: "Ajouter et modifier les leçons", ES: "Agregar y editar lecciones",
    PT: "Adicionar e editar aulas", AR: "إضافة وتعديل الدروس", ZH: "添加和编辑课程",
    DE: "Lektionen hinzufügen", JA: "レッスンの追加・編集", RU: "Добавлять и редактировать уроки",
  },
  "guardians.full_access": {
    EN: "Full access", HT: "Aksè konplè", FR: "Accès complet", ES: "Acceso completo",
    PT: "Acesso completo", AR: "وصول كامل", ZH: "完全访问",
    DE: "Vollzugriff", JA: "フルアクセス", RU: "Полный доступ",
  },
  "guardians.no_guardians": {
    EN: "No co-guardians added yet", HT: "Pa gen ko-gadyen ankò", FR: "Aucun co-tuteur ajouté", ES: "Sin co-tutores aún",
    PT: "Nenhum co-responsável", AR: "لا أولياء مشاركون بعد", ZH: "尚无共同监护人",
    DE: "Noch keine Mit-Erziehungsberechtigten", JA: "共同保護者はまだいません", RU: "Со-опекуны не добавлены",
  },
  "guardians.invite_accepted": {
    EN: "Invite accepted", HT: "Envitasyon aksepte", FR: "Invitation acceptée", ES: "Invitación aceptada",
    PT: "Convite aceito", AR: "تم قبول الدعوة", ZH: "邀请已接受",
    DE: "Einladung angenommen", JA: "招待が受け入れられました", RU: "Приглашение принято",
  },
  "guardians.manage": {
    EN: "Manage", HT: "Jere", FR: "Gérer", ES: "Gestionar",
    PT: "Gerenciar", AR: "إدارة", ZH: "管理",
    DE: "Verwalten", JA: "管理", RU: "Управление",
  },

  // ── Inbox ──
  "inbox.title": {
    EN: "Inbox", HT: "Bwat mesaj", FR: "Boîte de réception", ES: "Bandeja de entrada",
    PT: "Caixa de entrada", AR: "صندوق الوارد", ZH: "收件箱",
    DE: "Posteingang", JA: "受信トレイ", RU: "Входящие",
  },
  "inbox.empty": {
    EN: "No messages yet", HT: "Pa gen mesaj", FR: "Aucun message", ES: "Sin mensajes",
    PT: "Nenhuma mensagem", AR: "لا رسائل بعد", ZH: "暂无消息",
    DE: "Noch keine Nachrichten", JA: "メッセージはありません", RU: "Сообщений нет",
  },
  "inbox.mark_read": {
    EN: "Mark as read", HT: "Mak kòm li", FR: "Marquer comme lu", ES: "Marcar como leído",
    PT: "Marcar como lido", AR: "وضع علامة مقروء", ZH: "标记为已读",
    DE: "Als gelesen markieren", JA: "既読にする", RU: "Отметить прочитанным",
  },
  "inbox.mark_all_read": {
    EN: "Mark all as read", HT: "Mak tout kòm li", FR: "Tout marquer comme lu", ES: "Marcar todo como leído",
    PT: "Marcar tudo como lido", AR: "تحديد الكل مقروء", ZH: "全部标记为已读",
    DE: "Alle als gelesen markieren", JA: "すべて既読にする", RU: "Отметить все прочитанным",
  },
  "inbox.all": {
    EN: "All", HT: "Tout", FR: "Tout", ES: "Todos",
    PT: "Todos", AR: "الكل", ZH: "全部",
    DE: "Alle", JA: "すべて", RU: "Все",
  },
  "inbox.unread": {
    EN: "Unread", HT: "Pa li", FR: "Non lu", ES: "No leído",
    PT: "Não lido", AR: "غير مقروء", ZH: "未读",
    DE: "Ungelesen", JA: "未読", RU: "Непрочитанные",
  },
  "inbox.sos": {
    EN: "SOS", HT: "SOS", FR: "SOS", ES: "SOS",
    PT: "SOS", AR: "SOS", ZH: "SOS",
    DE: "SOS", JA: "SOS", RU: "SOS",
  },
  "inbox.lessons": {
    EN: "Lessons", HT: "Leson", FR: "Leçons", ES: "Lecciones",
    PT: "Aulas", AR: "دروس", ZH: "课程",
    DE: "Lektionen", JA: "レッスン", RU: "Уроки",
  },
  "inbox.rewards": {
    EN: "Rewards", HT: "Rekonpans", FR: "Récompenses", ES: "Recompensas",
    PT: "Recompensas", AR: "مكافآت", ZH: "奖励",
    DE: "Belohnungen", JA: "報酬", RU: "Награды",
  },
  "inbox.streaks": {
    EN: "Streaks", HT: "Seri", FR: "Séries", ES: "Rachas",
    PT: "Sequências", AR: "سلاسل", ZH: "连续记录",
    DE: "Serien", JA: "ストリーク", RU: "Серии",
  },
  "inbox.from": {
    EN: "From", HT: "De", FR: "De", ES: "De",
    PT: "De", AR: "من", ZH: "来自",
    DE: "Von", JA: "差出人", RU: "От",
  },
  "inbox.new_badge": {
    EN: "New", HT: "Nouvo", FR: "Nouveau", ES: "Nuevo",
    PT: "Novo", AR: "جديد", ZH: "新",
    DE: "Neu", JA: "新着", RU: "Новое",
  },
};

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  languages: LangOption[];
}

const I18nContext = createContext<I18nContextType>({
  lang: "EN",
  setLang: () => {},
  t: (key) => key,
  languages: LANGUAGES,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("im_lang");
    return (saved && VALID_LANGS.includes(saved as Lang)) ? saved as Lang : "EN";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("im_lang", l);
  }, []);

  const t = useCallback((key: string) => translations[key]?.[lang] || translations[key]?.["EN"] || key, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
export type { Lang };
export { LANGUAGES };
