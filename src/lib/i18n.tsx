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
  "app.title": { EN: "Independent Minds EDU", HT: "Independent Minds EDU", FR: "Independent Minds EDU", ES: "Independent Minds EDU", PT: "Independent Minds EDU", AR: "Independent Minds EDU", ZH: "Independent Minds EDU", DE: "Independent Minds EDU", JA: "Independent Minds EDU", RU: "Independent Minds EDU" },
  "app.subtitle": { EN: "Homeschool management for families worldwide", HT: "Jesyon edikasyon lakay pou fanmi toupatou nan mond lan", FR: "Gestion de l'école à domicile pour les familles du monde entier", ES: "Gestión de educación en casa para familias de todo el mundo", PT: "Gestão de ensino domiciliar para famílias em todo o mundo", AR: "إدارة التعليم المنزلي للعائلات في جميع أنحاء العالم", ZH: "面向全球家庭的家庭教育管理", DE: "Homeschool-Verwaltung für Familien weltweit", JA: "世界中の家族のためのホームスクール管理", RU: "Управление домашним обучением для семей по всему миру" },
  "app.version": { EN: "Independent Minds EDU v4.1", HT: "Independent Minds EDU v4.1" },

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
  "auth.fullName": { EN: "Full Name", HT: "Non Konplè", FR: "Nom complet", ES: "Nombre completo", PT: "Nome completo", AR: "الاسم الكامل", ZH: "全名", DE: "Vollständiger Name", JA: "氏名", RU: "Полное имя" },
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

  // ── Beta ──
  "beta.badge": { EN: "Beta Tester", HT: "Testè Beta", FR: "Testeur Bêta", ES: "Beta Tester", PT: "Testador Beta", AR: "مختبر تجريبي", ZH: "Beta测试员", DE: "Beta-Tester", JA: "ベータテスター", RU: "Бета-тестер" },
  "beta.welcome_title": { EN: "Welcome to the beta", HT: "Byenveni nan beta a", FR: "Bienvenue dans la bêta", ES: "Bienvenido a la beta", PT: "Bem-vindo ao beta", AR: "مرحبًا بك في النسخة التجريبية", ZH: "欢迎参加测试", DE: "Willkommen zur Beta", JA: "ベータへようこそ", RU: "Добро пожаловать в бету" },
  "beta.welcome_subtitle": { EN: "You're one of our first testers. Your feedback shapes this platform.", HT: "Ou se youn nan premye testè nou yo. Fidbak ou ap ede fòme platfòm sa a.", FR: "Vous êtes l'un de nos premiers testeurs. Vos retours façonnent cette plateforme.", ES: "Eres uno de nuestros primeros testers. Tu feedback da forma a esta plataforma.", PT: "Você é um dos nossos primeiros testadores. Seu feedback molda esta plataforma.", AR: "أنت من أوائل المختبرين لدينا. ملاحظاتك تشكل هذه المنصة.", ZH: "您是我们的首批测试员之一，您的反馈将塑造这个平台。", DE: "Sie sind einer unserer ersten Tester. Ihr Feedback formt diese Plattform.", JA: "あなたは最初のテスターの一人です。あなたのフィードバックがこのプラットフォームを形作ります。", RU: "Вы один из наших первых тестировщиков. Ваши отзывы формируют эту платформу." },
  "beta.your_tasks": { EN: "Your test tasks", HT: "Travay tès ou yo", FR: "Vos tâches de test", ES: "Tus tareas de prueba", PT: "Suas tarefas de teste", AR: "مهام الاختبار الخاصة بك", ZH: "您的测试任务", DE: "Ihre Testaufgaben", JA: "テストタスク", RU: "Ваши тестовые задания" },
  "beta.tasks_progress": { EN: "{{done}} of {{total}} tasks completed", HT: "{{done}} sou {{total}} travay fini", FR: "{{done}} sur {{total}} tâches terminées", ES: "{{done}} de {{total}} tareas completadas", PT: "{{done}} de {{total}} tarefas concluídas", AR: "{{done}} من {{total}} مهمة مكتملة", ZH: "已完成 {{done}}/{{total}} 个任务", DE: "{{done}} von {{total}} Aufgaben abgeschlossen", JA: "{{done}}/{{total}} タスク完了", RU: "{{done}} из {{total}} заданий выполнено" },
  "beta.task_start": { EN: "Start task", HT: "Kòmanse travay", FR: "Démarrer la tâche", ES: "Iniciar tarea", PT: "Iniciar tarefa", AR: "بدء المهمة", ZH: "开始任务", DE: "Aufgabe starten", JA: "タスクを開始", RU: "Начать задание" },
  "beta.task_done": { EN: "Mark complete", HT: "Make fini", FR: "Marquer terminé", ES: "Marcar completada", PT: "Marcar concluída", AR: "وضع علامة مكتملة", ZH: "标记完成", DE: "Als erledigt markieren", JA: "完了にする", RU: "Отметить выполненным" },
  "beta.task_skip": { EN: "Skip", HT: "Sote", FR: "Passer", ES: "Omitir", PT: "Pular", AR: "تخطي", ZH: "跳过", DE: "Überspringen", JA: "スキップ", RU: "Пропустить" },
  "beta.free_explore": { EN: "Free exploration", HT: "Eksplorasyon lib", FR: "Exploration libre", ES: "Exploración libre", PT: "Exploração livre", AR: "استكشاف حر", ZH: "自由探索", DE: "Freie Erkundung", JA: "自由探索", RU: "Свободное исследование" },
  "beta.free_explore_desc": { EN: "Done? Explore anything.", HT: "Fini? Eksplore nenpòt bagay.", FR: "Terminé ? Explorez librement.", ES: "¿Listo? Explora lo que quieras.", PT: "Pronto? Explore o que quiser.", AR: "انتهيت؟ استكشف أي شيء.", ZH: "完成了？随意探索。", DE: "Fertig? Erkunden Sie alles.", JA: "終わりましたか？自由に探索してください。", RU: "Готово? Исследуйте что угодно." },
  "beta.feedback_btn": { EN: "Give feedback", HT: "Bay fidbak", FR: "Donner un avis", ES: "Dar feedback", PT: "Dar feedback", AR: "إعطاء ملاحظات", ZH: "提供反馈", DE: "Feedback geben", JA: "フィードバックする", RU: "Оставить отзыв" },
  "beta.bug_btn": { EN: "Report a bug", HT: "Rapòte yon erè", FR: "Signaler un bug", ES: "Reportar un bug", PT: "Reportar um bug", AR: "الإبلاغ عن خطأ", ZH: "报告问题", DE: "Fehler melden", JA: "バグを報告", RU: "Сообщить об ошибке" },
  "beta.nps_question": { EN: "How likely to recommend this platform? (0-10)", HT: "Ki chans ou rekòmande platfòm sa a? (0-10)", FR: "Quelle probabilité de recommander cette plateforme ? (0-10)", ES: "¿Qué tan probable es que recomiendes esta plataforma? (0-10)", PT: "Qual a probabilidade de recomendar esta plataforma? (0-10)", AR: "ما مدى احتمالية توصيتك بهذه المنصة؟ (0-10)", ZH: "您推荐此平台的可能性有多大？(0-10)", DE: "Wie wahrscheinlich würden Sie diese Plattform empfehlen? (0-10)", JA: "このプラットフォームを推薦する可能性は？(0-10)", RU: "Насколько вероятно, что вы порекомендуете эту платформу? (0-10)" },
  "beta.nps_submit": { EN: "Submit", HT: "Soumèt", FR: "Soumettre", ES: "Enviar", PT: "Enviar", AR: "إرسال", ZH: "提交", DE: "Absenden", JA: "送信", RU: "Отправить" },
  "beta.nps_thanks": { EN: "Thank you!", HT: "Mèsi!", FR: "Merci !", ES: "¡Gracias!", PT: "Obrigado!", AR: "شكراً!", ZH: "谢谢！", DE: "Danke!", JA: "ありがとうございます！", RU: "Спасибо!" },
  "beta.widget_title": { EN: "Quick feedback", HT: "Fidbak rapid", FR: "Retour rapide", ES: "Feedback rápido", PT: "Feedback rápido", AR: "ملاحظات سريعة", ZH: "快速反馈", DE: "Schnelles Feedback", JA: "クイックフィードバック", RU: "Быстрый отзыв" },
  "beta.widget_rating": { EN: "Rate this page", HT: "Evalye paj sa a", FR: "Évaluer cette page", ES: "Calificar esta página", PT: "Avaliar esta página", AR: "قيّم هذه الصفحة", ZH: "评价此页面", DE: "Diese Seite bewerten", JA: "このページを評価", RU: "Оценить эту страницу" },
  "beta.widget_comment": { EN: "What could be better?", HT: "Kisa ki ta ka pi bon?", FR: "Que pourrait-on améliorer ?", ES: "¿Qué podría mejorar?", PT: "O que poderia ser melhor?", AR: "ما الذي يمكن تحسينه؟", ZH: "有什么可以改进的？", DE: "Was könnte besser sein?", JA: "改善点は？", RU: "Что можно улучшить?" },
  "beta.widget_submit": { EN: "Send", HT: "Voye", FR: "Envoyer", ES: "Enviar", PT: "Enviar", AR: "إرسال", ZH: "发送", DE: "Senden", JA: "送信", RU: "Отправить" },
  "beta.survey_title": { EN: "How was your session?", HT: "Koman sesyon an te ye?", FR: "Comment s'est passée votre session ?", ES: "¿Cómo fue tu sesión?", PT: "Como foi sua sessão?", AR: "كيف كانت جلستك؟", ZH: "您的使用体验如何？", DE: "Wie war Ihre Sitzung?", JA: "セッションはいかがでしたか？", RU: "Как прошла ваша сессия?" },
  "beta.survey_q1": { EN: "How easy was it to complete your tasks?", HT: "Ki jan li te fasil pou w fini travay ou yo?", FR: "A-t-il été facile de terminer vos tâches ?", ES: "¿Qué tan fácil fue completar tus tareas?", PT: "Foi fácil completar suas tarefas?", AR: "ما مدى سهولة إكمال مهامك؟", ZH: "完成任务有多容易？", DE: "Wie einfach war es, Ihre Aufgaben zu erledigen?", JA: "タスクの完了はどれくらい簡単でしたか？", RU: "Насколько легко было выполнить задания?" },
  "beta.survey_q2": { EN: "What did you like most?", HT: "Kisa w te pi renmen?", FR: "Qu'avez-vous le plus aimé ?", ES: "¿Qué te gustó más?", PT: "O que mais gostou?", AR: "ما الذي أعجبك أكثر؟", ZH: "您最喜欢什么？", DE: "Was hat Ihnen am besten gefallen?", JA: "最も気に入った点は？", RU: "Что понравилось больше всего?" },
  "beta.survey_q3": { EN: "What was most confusing?", HT: "Kisa ki te pi konfize?", FR: "Qu'est-ce qui était le plus confus ?", ES: "¿Qué fue lo más confuso?", PT: "O que foi mais confuso?", AR: "ما الذي كان أكثر إرباكاً؟", ZH: "最让您困惑的是什么？", DE: "Was war am verwirrendsten?", JA: "最も分かりにくかった点は？", RU: "Что было наиболее запутанным?" },
  "beta.survey_q4": { EN: "What feature would you add?", HT: "Ki fonksyon ou ta ajoute?", FR: "Quelle fonctionnalité ajouteriez-vous ?", ES: "¿Qué función agregarías?", PT: "Que funcionalidade você adicionaria?", AR: "ما الميزة التي تريد إضافتها؟", ZH: "您希望添加什么功能？", DE: "Welche Funktion würden Sie hinzufügen?", JA: "追加してほしい機能は？", RU: "Какую функцию вы бы добавили?" },
  "beta.survey_q5": { EN: "Other comments?", HT: "Lòt kòmantè?", FR: "Autres commentaires ?", ES: "¿Otros comentarios?", PT: "Outros comentários?", AR: "تعليقات أخرى؟", ZH: "其他意见？", DE: "Weitere Kommentare?", JA: "その他のコメント", RU: "Другие комментарии?" },
  "beta.survey_submit": { EN: "Submit feedback", HT: "Soumèt fidbak", FR: "Soumettre un avis", ES: "Enviar feedback", PT: "Enviar feedback", AR: "إرسال الملاحظات", ZH: "提交反馈", DE: "Feedback absenden", JA: "フィードバックを送信", RU: "Отправить отзыв" },
  "beta.survey_thanks": { EN: "Thank you!", HT: "Mèsi!", FR: "Merci !", ES: "¡Gracias!", PT: "Obrigado!", AR: "شكراً!", ZH: "谢谢！", DE: "Danke!", JA: "ありがとうございます！", RU: "Спасибо!" },
  "beta.bug_title": { EN: "Report a bug", HT: "Rapòte yon erè", FR: "Signaler un bug", ES: "Reportar un bug", PT: "Reportar um bug", AR: "الإبلاغ عن خطأ", ZH: "报告问题", DE: "Fehler melden", JA: "バグを報告", RU: "Сообщить об ошибке" },
  "beta.bug_desc": { EN: "What happened?", HT: "Kisa ki te pase?", FR: "Que s'est-il passé ?", ES: "¿Qué pasó?", PT: "O que aconteceu?", AR: "ماذا حدث؟", ZH: "发生了什么？", DE: "Was ist passiert?", JA: "何が起きましたか？", RU: "Что произошло?" },
  "beta.bug_expected": { EN: "What did you expect?", HT: "Kisa w te atann?", FR: "Qu'attendiez-vous ?", ES: "¿Qué esperabas?", PT: "O que esperava?", AR: "ماذا توقعت؟", ZH: "您期望什么？", DE: "Was hatten Sie erwartet?", JA: "期待していたことは？", RU: "Что вы ожидали?" },
  "beta.bug_steps": { EN: "Steps to reproduce", HT: "Etap pou repwodui", FR: "Étapes pour reproduire", ES: "Pasos para reproducir", PT: "Passos para reproduzir", AR: "خطوات لإعادة الإنتاج", ZH: "重现步骤", DE: "Schritte zur Reproduktion", JA: "再現手順", RU: "Шаги для воспроизведения" },
  "beta.bug_screenshot": { EN: "Screenshot (optional)", HT: "Ekran (opsyonèl)", FR: "Capture d'écran (optionnel)", ES: "Captura (opcional)", PT: "Captura de tela (opcional)", AR: "لقطة شاشة (اختياري)", ZH: "截图（可选）", DE: "Screenshot (optional)", JA: "スクリーンショット（任意）", RU: "Скриншот (необязательно)" },
  "beta.bug_submit": { EN: "Send report", HT: "Voye rapò", FR: "Envoyer le rapport", ES: "Enviar reporte", PT: "Enviar relatório", AR: "إرسال التقرير", ZH: "发送报告", DE: "Bericht senden", JA: "レポートを送信", RU: "Отправить отчёт" },
  "beta.request_title": { EN: "Request beta access", HT: "Mande aksè beta", FR: "Demander l'accès bêta", ES: "Solicitar acceso beta", PT: "Solicitar acesso beta", AR: "طلب الوصول التجريبي", ZH: "申请测试资格", DE: "Beta-Zugang anfordern", JA: "ベータアクセスをリクエスト", RU: "Запросить доступ к бете" },
  "beta.request_subtitle": { EN: "Help shape the future of homeschool management", HT: "Ede fòme avni jesyon edikasyon lakay", FR: "Aidez à façonner l'avenir de la gestion scolaire à domicile", ES: "Ayuda a dar forma al futuro de la educación en casa", PT: "Ajude a moldar o futuro da gestão do ensino domiciliar", AR: "ساعد في تشكيل مستقبل إدارة التعليم المنزلي", ZH: "帮助塑造家庭教育管理的未来", DE: "Helfen Sie, die Zukunft des Homeschoolings zu gestalten", JA: "ホームスクール管理の未来を一緒に作りましょう", RU: "Помогите сформировать будущее домашнего обучения" },
  "beta.request_motivation_placeholder": { EN: "Tell us about your homeschool journey...", HT: "Pale nou de eksperyans edikasyon lakay ou...", FR: "Parlez-nous de votre parcours d'école à domicile...", ES: "Cuéntanos sobre tu experiencia educando en casa...", PT: "Conte-nos sobre sua jornada de ensino domiciliar...", AR: "أخبرنا عن رحلتك في التعليم المنزلي...", ZH: "告诉我们您的家庭教育经历...", DE: "Erzählen Sie uns von Ihrer Homeschool-Erfahrung...", JA: "ホームスクールの経験について教えてください...", RU: "Расскажите о вашем опыте домашнего обучения..." },
  "beta.request_thanks_desc": { EN: "We'll review your application and get back to you soon.", HT: "Nap revize aplikasyon ou epi nap reponn ou byento.", FR: "Nous examinerons votre demande et reviendrons vers vous.", ES: "Revisaremos tu solicitud y te contactaremos pronto.", PT: "Analisaremos sua solicitação e retornaremos em breve.", AR: "سنراجع طلبك ونعود إليك قريباً.", ZH: "我们将审核您的申请并尽快回复。", DE: "Wir prüfen Ihre Bewerbung und melden uns bald.", JA: "申請を確認し、間もなくご連絡いたします。", RU: "Мы рассмотрим вашу заявку и свяжемся с вами." },
  "beta.request_footer": { EN: "Your data is secure. We only use it to manage your beta access.", HT: "Done ou an sekirite. Nou sèlman itilize li pou jere aksè beta ou.", FR: "Vos données sont sécurisées. Nous ne les utilisons que pour gérer votre accès bêta.", ES: "Tus datos están seguros. Solo los usamos para gestionar tu acceso beta.", PT: "Seus dados estão seguros. Usamos apenas para gerenciar seu acesso beta.", AR: "بياناتك آمنة. نستخدمها فقط لإدارة وصولك التجريبي.", ZH: "您的数据安全。我们仅用于管理您的测试访问权限。", DE: "Ihre Daten sind sicher. Wir verwenden sie nur zur Verwaltung Ihres Beta-Zugangs.", JA: "データは安全です。ベータアクセスの管理にのみ使用します。", RU: "Ваши данные в безопасности. Мы используем их только для управления бета-доступом." },
  "beta.feature_schedule": { EN: "Smart scheduling", HT: "Orè entelijan", FR: "Planification intelligente", ES: "Horarios inteligentes", PT: "Agendamento inteligente", AR: "جدولة ذكية", ZH: "智能排课", DE: "Intelligente Planung", JA: "スマートスケジュール", RU: "Умное расписание" },
  "beta.feature_ai": { EN: "AI tutor", HT: "Titè AI", FR: "Tuteur IA", ES: "Tutor IA", PT: "Tutor IA", AR: "مدرس ذكاء اصطناعي", ZH: "AI辅导", DE: "KI-Tutor", JA: "AIチューター", RU: "ИИ-репетитор" },
  "beta.feature_privacy": { EN: "Privacy-first", HT: "Vi prive an premye", FR: "Confidentialité d'abord", ES: "Privacidad primero", PT: "Privacidade primeiro", AR: "الخصوصية أولاً", ZH: "隐私优先", DE: "Datenschutz zuerst", JA: "プライバシー重視", RU: "Конфиденциальность прежде всего" },
  "beta.request_name": { EN: "Your name", HT: "Non ou", FR: "Votre nom", ES: "Tu nombre", PT: "Seu nome", AR: "اسمك", ZH: "您的姓名", DE: "Ihr Name", JA: "お名前", RU: "Ваше имя" },
  "beta.request_email": { EN: "Your email", HT: "Imèl ou", FR: "Votre courriel", ES: "Tu correo", PT: "Seu e-mail", AR: "بريدك الإلكتروني", ZH: "您的邮箱", DE: "Ihre E-Mail", JA: "メールアドレス", RU: "Ваш email" },
  "beta.request_type": { EN: "I am a...", HT: "Mwen se yon...", FR: "Je suis un...", ES: "Soy un...", PT: "Eu sou um...", AR: "أنا...", ZH: "我是...", DE: "Ich bin ein...", JA: "私は...", RU: "Я..." },
  "beta.request_motivation": { EN: "Why do you want to test?", HT: "Poukisa w vle teste?", FR: "Pourquoi voulez-vous tester ?", ES: "¿Por qué quieres probar?", PT: "Por que quer testar?", AR: "لماذا تريد الاختبار؟", ZH: "您为什么想参与测试？", DE: "Warum möchten Sie testen?", JA: "テストに参加したい理由は？", RU: "Почему вы хотите тестировать?" },
  "beta.request_submit": { EN: "Request access", HT: "Mande aksè", FR: "Demander l'accès", ES: "Solicitar acceso", PT: "Solicitar acesso", AR: "طلب الوصول", ZH: "申请访问", DE: "Zugang anfordern", JA: "アクセスをリクエスト", RU: "Запросить доступ" },
  "beta.request_thanks": { EN: "Request received!", HT: "Demann resevwa!", FR: "Demande reçue !", ES: "¡Solicitud recibida!", PT: "Solicitação recebida!", AR: "تم استلام الطلب!", ZH: "申请已收到！", DE: "Anfrage erhalten!", JA: "リクエストを受け付けました！", RU: "Запрос получен!" },
  "beta.referred_by_label": { EN: "Referred by", HT: "Refere pa", FR: "Référé par", ES: "Referido por", PT: "Indicado por", AR: "إحالة من", ZH: "推荐人", DE: "Empfohlen von", JA: "紹介者", RU: "По рекомендации" },
  "beta.referral_title": { EN: "Share & Earn", HT: "Pataje e touche", FR: "Partager et gagner", ES: "Comparte y gana", PT: "Compartilhe e ganhe", AR: "شارك واكسب", ZH: "分享赚取", DE: "Teilen & verdienen", JA: "共有して獲得", RU: "Делитесь и зарабатывайте" },
  "beta.referral_desc": { EN: "Earn 50 points for each person you refer who becomes a tester!", HT: "Touche 50 pwen pou chak moun ou refere ki vin yon testè!", FR: "Gagnez 50 points pour chaque personne que vous recommandez !", ES: "¡Gana 50 puntos por cada persona que refieras!", PT: "Ganhe 50 pontos para cada pessoa que indicar!", AR: "اكسب 50 نقطة لكل شخص تحيله!", ZH: "每推荐一人成为测试者即可获得50积分！", DE: "Verdienen Sie 50 Punkte für jede Empfehlung!", JA: "紹介した人がテスターになると50ポイント獲得！", RU: "Получите 50 баллов за каждого приглашённого тестера!" },
  "beta.referral_link": { EN: "Your referral link", HT: "Lyen referral ou", FR: "Votre lien de parrainage", ES: "Tu enlace de referencia", PT: "Seu link de indicação", AR: "رابط الإحالة الخاص بك", ZH: "您的推荐链接", DE: "Ihr Empfehlungslink", JA: "あなたの紹介リンク", RU: "Ваша реферальная ссылка" },
  "beta.referral_copied": { EN: "Link copied!", HT: "Lyen kopye!", FR: "Lien copié !", ES: "¡Enlace copiado!", PT: "Link copiado!", AR: "تم نسخ الرابط!", ZH: "链接已复制！", DE: "Link kopiert!", JA: "リンクがコピーされました！", RU: "Ссылка скопирована!" },
  "beta.referral_count": { EN: "Successful referrals", HT: "Referral ki reyisi", FR: "Parrainages réussis", ES: "Referencias exitosas", PT: "Indicações bem-sucedidas", AR: "الإحالات الناجحة", ZH: "成功推荐数", DE: "Erfolgreiche Empfehlungen", JA: "成功した紹介数", RU: "Успешные рефералы" },
  "beta.invite_title": { EN: "You're invited to test Independent Minds EDU", HT: "Ou envite pou teste Independent Minds EDU", FR: "Vous êtes invité à tester Independent Minds EDU", ES: "Estás invitado a probar Independent Minds EDU", PT: "Você foi convidado para testar Independent Minds EDU", AR: "أنت مدعو لاختبار Independent Minds EDU", ZH: "您被邀请测试 Independent Minds EDU", DE: "Sie sind eingeladen, Independent Minds EDU zu testen", JA: "Independent Minds EDU のテストに招待されました", RU: "Вы приглашены тестировать Independent Minds EDU" },
  "beta.invite_accept": { EN: "Accept invitation", HT: "Aksepte envitasyon", FR: "Accepter l'invitation", ES: "Aceptar invitación", PT: "Aceitar convite", AR: "قبول الدعوة", ZH: "接受邀请", DE: "Einladung annehmen", JA: "招待を受け入れる", RU: "Принять приглашение" },
  "beta.invite_expired": { EN: "This invitation has expired.", HT: "Envitasyon sa a ekspire.", FR: "Cette invitation a expiré.", ES: "Esta invitación ha expirado.", PT: "Este convite expirou.", AR: "انتهت صلاحية هذه الدعوة.", ZH: "此邀请已过期。", DE: "Diese Einladung ist abgelaufen.", JA: "この招待は期限切れです。", RU: "Срок действия этого приглашения истёк." },
  "beta.recording_notice": { EN: "Session recorded anonymously to improve the platform.", HT: "Sesyon anrejistre anonim pou amelyore platfòm nan.", FR: "Session enregistrée anonymement pour améliorer la plateforme.", ES: "Sesión grabada anónimamente para mejorar la plataforma.", PT: "Sessão gravada anonimamente para melhorar a plataforma.", AR: "يتم تسجيل الجلسة مجهولاً لتحسين المنصة.", ZH: "会话匿名录制以改进平台。", DE: "Sitzung wird anonym aufgezeichnet, um die Plattform zu verbessern.", JA: "プラットフォーム改善のためセッションを匿名で記録します。", RU: "Сессия записывается анонимно для улучшения платформы." },
  "beta.recording_ok": { EN: "That's fine", HT: "Sa bon", FR: "C'est bon", ES: "Está bien", PT: "Tudo bem", AR: "لا بأس", ZH: "没问题", DE: "Das ist in Ordnung", JA: "問題ありません", RU: "Хорошо" },
  "beta.recording_opt_out": { EN: "Opt out", HT: "Refize", FR: "Refuser", ES: "No participar", PT: "Recusar", AR: "إلغاء الاشتراك", ZH: "退出", DE: "Ablehnen", JA: "オプトアウト", RU: "Отказаться" },
  "beta.exit_survey": { EN: "Before you go — quick survey?", HT: "Anvan w ale — ti sondaj rapid?", FR: "Avant de partir — un sondage rapide ?", ES: "Antes de irte — ¿una encuesta rápida?", PT: "Antes de sair — pesquisa rápida?", AR: "قبل أن تغادر — استطلاع سريع؟", ZH: "离开前——做个简短调查？", DE: "Bevor Sie gehen — kurze Umfrage?", JA: "離れる前に — 簡単なアンケート？", RU: "Перед уходом — быстрый опрос?" },
  "beta.exit_later": { EN: "Maybe later", HT: "Petèt pita", FR: "Peut-être plus tard", ES: "Quizás más tarde", PT: "Talvez depois", AR: "ربما لاحقاً", ZH: "以后再说", DE: "Vielleicht später", JA: "また今度", RU: "Может быть позже" },

  // Beta task titles/descriptions
  "beta_task.parent.1.title": { EN: "Set up first student", HT: "Mete premye elèv", FR: "Configurer le premier élève", ES: "Configurar primer estudiante", PT: "Configurar primeiro aluno", AR: "إعداد أول طالب", ZH: "设置第一个学生", DE: "Ersten Schüler einrichten", JA: "最初の生徒を設定", RU: "Настроить первого ученика" },
  "beta_task.parent.1.desc": { EN: "Complete onboarding and add your first student profile", HT: "Fini anrejistreman epi ajoute premye pwofil elèv ou", FR: "Terminer l'intégration et ajouter votre premier profil d'élève", ES: "Completar la incorporación y agregar tu primer perfil de estudiante", PT: "Completar a integração e adicionar o primeiro perfil de aluno", AR: "أكمل عملية الإعداد وأضف أول ملف طالب", ZH: "完成入职并添加第一个学生资料", DE: "Onboarding abschließen und erstes Schülerprofil hinzufügen", JA: "オンボーディングを完了し最初の生徒プロフィールを追加", RU: "Завершить регистрацию и добавить первый профиль ученика" },
  "beta_task.parent.2.title": { EN: "Build weekly schedule", HT: "Bati orè semèn", FR: "Créer l'emploi du temps", ES: "Crear horario semanal", PT: "Criar agenda semanal", AR: "إنشاء جدول أسبوعي", ZH: "创建每周课表", DE: "Wochenplan erstellen", JA: "週間スケジュールを作成", RU: "Создать недельное расписание" },
  "beta_task.parent.2.desc": { EN: "Add schedule blocks for a week", HT: "Ajoute blòk orè pou yon semèn", FR: "Ajouter des blocs d'emploi du temps pour une semaine", ES: "Agregar bloques de horario para una semana", PT: "Adicionar blocos de agenda para uma semana", AR: "إضافة كتل جدول لأسبوع", ZH: "为一周添加课表块", DE: "Zeitblöcke für eine Woche hinzufügen", JA: "1週間のスケジュールブロックを追加", RU: "Добавить блоки расписания на неделю" },
  "beta_task.parent.3.title": { EN: "Connect notifications", HT: "Konekte notifikasyon", FR: "Connecter les notifications", ES: "Conectar notificaciones", PT: "Conectar notificações", AR: "ربط الإشعارات", ZH: "连接通知", DE: "Benachrichtigungen verbinden", JA: "通知を接続", RU: "Подключить уведомления" },
  "beta_task.parent.3.desc": { EN: "Set up Telegram or WhatsApp notifications", HT: "Mete Telegram oswa WhatsApp notifikasyon", FR: "Configurer les notifications Telegram ou WhatsApp", ES: "Configurar notificaciones por Telegram o WhatsApp", PT: "Configurar notificações por Telegram ou WhatsApp", AR: "إعداد إشعارات Telegram أو WhatsApp", ZH: "设置 Telegram 或 WhatsApp 通知", DE: "Telegram- oder WhatsApp-Benachrichtigungen einrichten", JA: "TelegramまたはWhatsApp通知を設定", RU: "Настроить уведомления Telegram или WhatsApp" },
  "beta_task.parent.4.title": { EN: "Create a reward", HT: "Kreye yon rekonpans", FR: "Créer une récompense", ES: "Crear una recompensa", PT: "Criar uma recompensa", AR: "إنشاء مكافأة", ZH: "创建奖励", DE: "Belohnung erstellen", JA: "報酬を作成", RU: "Создать награду" },
  "beta_task.parent.4.desc": { EN: "Add a custom reward to the rewards catalog", HT: "Ajoute yon rekonpans pèsonalize nan katalòg", FR: "Ajouter une récompense personnalisée au catalogue", ES: "Agregar una recompensa personalizada al catálogo", PT: "Adicionar uma recompensa personalizada ao catálogo", AR: "إضافة مكافأة مخصصة إلى الكتالوج", ZH: "向奖励目录添加自定义奖励", DE: "Eine benutzerdefinierte Belohnung zum Katalog hinzufügen", JA: "報酬カタログにカスタム報酬を追加", RU: "Добавить пользовательскую награду в каталог" },
  "beta_task.parent.5.title": { EN: "Invite a co-guardian", HT: "Envite yon ko-gadyen", FR: "Inviter un co-tuteur", ES: "Invitar un co-tutor", PT: "Convidar um co-responsável", AR: "دعوة ولي مشارك", ZH: "邀请共同监护人", DE: "Mit-Erziehungsberechtigten einladen", JA: "共同保護者を招待", RU: "Пригласить со-опекуна" },
  "beta_task.parent.5.desc": { EN: "Send a co-guardian invite via email", HT: "Voye envitasyon ko-gadyen pa imèl", FR: "Envoyer une invitation de co-tuteur par courriel", ES: "Enviar una invitación de co-tutor por correo", PT: "Enviar convite de co-responsável por e-mail", AR: "إرسال دعوة ولي مشارك عبر البريد", ZH: "通过电子邮件发送共同监护人邀请", DE: "Eine Mit-Erziehungsberechtigten-Einladung per E-Mail senden", JA: "共同保護者の招待をメールで送信", RU: "Отправить приглашение со-опекуну по email" },
  "beta_task.parent.6.title": { EN: "Read one message", HT: "Li yon mesaj", FR: "Lire un message", ES: "Leer un mensaje", PT: "Ler uma mensagem", AR: "قراءة رسالة واحدة", ZH: "阅读一条消息", DE: "Eine Nachricht lesen", JA: "メッセージを1つ読む", RU: "Прочитать одно сообщение" },
  "beta_task.parent.6.desc": { EN: "Open and read a message in the inbox", HT: "Ouvri epi li yon mesaj nan bwat mesaj", FR: "Ouvrir et lire un message dans la boîte de réception", ES: "Abrir y leer un mensaje en la bandeja", PT: "Abrir e ler uma mensagem na caixa de entrada", AR: "افتح واقرأ رسالة في صندوق الوارد", ZH: "打开并阅读收件箱中的一条消息", DE: "Eine Nachricht im Posteingang öffnen und lesen", JA: "受信トレイのメッセージを1つ開いて読む", RU: "Открыть и прочитать сообщение во входящих" },
  "beta_task.parent.7.title": { EN: "Download PDF report", HT: "Telechaje rapò PDF", FR: "Télécharger le rapport PDF", ES: "Descargar informe PDF", PT: "Baixar relatório PDF", AR: "تحميل تقرير PDF", ZH: "下载PDF报告", DE: "PDF-Bericht herunterladen", JA: "PDFレポートをダウンロード", RU: "Скачать PDF-отчёт" },
  "beta_task.parent.7.desc": { EN: "Generate and download a student progress report", HT: "Jenere epi telechaje yon rapò pwogrè elèv", FR: "Générer et télécharger un rapport de progression", ES: "Generar y descargar un informe de progreso", PT: "Gerar e baixar um relatório de progresso", AR: "إنشاء وتحميل تقرير تقدم الطالب", ZH: "生成并下载学生进度报告", DE: "Einen Fortschrittsbericht generieren und herunterladen", JA: "生徒の進捗レポートを生成してダウンロード", RU: "Сгенерировать и скачать отчёт о прогрессе" },
  "beta_task.student.1.title": { EN: "Explore dashboard", HT: "Eksplore tablo", FR: "Explorer le tableau de bord", ES: "Explorar panel", PT: "Explorar painel", AR: "استكشاف لوحة التحكم", ZH: "探索仪表板", DE: "Dashboard erkunden", JA: "ダッシュボードを探索", RU: "Изучить панель" },
  "beta_task.student.1.desc": { EN: "Explore schedule and pace thermometer", HT: "Eksplore orè ak tèmomèt vitès", FR: "Explorer l'emploi du temps et le thermomètre de rythme", ES: "Explorar horario y termómetro de ritmo", PT: "Explorar agenda e termômetro de ritmo", AR: "استكشاف الجدول ومقياس السرعة", ZH: "探索课表和进度温度计", DE: "Zeitplan und Tempothermometer erkunden", JA: "スケジュールとペースサーモメーターを探索", RU: "Изучить расписание и индикатор темпа" },
  "beta_task.student.2.title": { EN: "Mark a block done", HT: "Make yon blòk fini", FR: "Marquer un bloc terminé", ES: "Marcar un bloque hecho", PT: "Marcar um bloco concluído", AR: "وضع علامة إنجاز على كتلة", ZH: "标记一个区块完成", DE: "Einen Block als erledigt markieren", JA: "ブロックを完了にする", RU: "Отметить блок как выполненный" },
  "beta_task.student.2.desc": { EN: "Mark one block done and submit mood", HT: "Make yon blòk fini epi soumèt imè", FR: "Marquer un bloc terminé et soumettre l'humeur", ES: "Marcar un bloque hecho y enviar estado de ánimo", PT: "Marcar um bloco e enviar humor", AR: "ضع علامة على كتلة واحدة وأرسل المزاج", ZH: "标记一个区块完成并提交情绪", DE: "Einen Block als erledigt markieren und Stimmung angeben", JA: "ブロックを完了にし気分を送信", RU: "Отметить блок и отправить настроение" },
  "beta_task.student.3.title": { EN: "Ask Mr A a question", HT: "Poze Mr A yon kesyon", FR: "Poser une question à Mr A", ES: "Hacer una pregunta a Mr A", PT: "Fazer uma pergunta ao Mr A", AR: "اسأل Mr A سؤالاً", ZH: "向Mr A提问", DE: "Mr A eine Frage stellen", JA: "Mr Aに質問する", RU: "Задать вопрос Mr A" },
  "beta_task.student.3.desc": { EN: "Use the AI tutor to get help with a subject", HT: "Itilize pwofesè AI pou jwenn èd ak yon matyè", FR: "Utiliser le tuteur IA pour obtenir de l'aide", ES: "Usar el tutor IA para obtener ayuda", PT: "Usar o tutor de IA para obter ajuda", AR: "استخدم المعلم الذكي للحصول على مساعدة", ZH: "使用AI辅导获取科目帮助", DE: "Den KI-Tutor nutzen, um Hilfe zu einem Fach zu erhalten", JA: "AIチューターを使って科目の助けを得る", RU: "Использовать ИИ-репетитора для помощи по предмету" },
  "beta_task.student.4.title": { EN: "Send SOS request", HT: "Voye demann SOS", FR: "Envoyer une demande SOS", ES: "Enviar solicitud SOS", PT: "Enviar pedido SOS", AR: "إرسال طلب SOS", ZH: "发送SOS请求", DE: "SOS-Anfrage senden", JA: "SOSリクエストを送信", RU: "Отправить SOS-запрос" },
  "beta_task.student.4.desc": { EN: "Submit a check-in with need help enabled", HT: "Soumèt yon tcheke ak bezwen èd aktive", FR: "Soumettre un pointage avec demande d'aide", ES: "Enviar un registro con solicitud de ayuda", PT: "Enviar um check-in com pedido de ajuda", AR: "أرسل تسجيلاً مع تفعيل طلب المساعدة", ZH: "提交启用需要帮助的签到", DE: "Ein Check-in mit Hilfe-Anfrage einreichen", JA: "ヘルプ要請付きのチェックインを送信", RU: "Отправить отметку с запросом помощи" },
  "beta_task.student.5.title": { EN: "Browse and redeem", HT: "Gade epi rachte", FR: "Parcourir et échanger", ES: "Explorar y canjear", PT: "Navegar e resgatar", AR: "تصفح واسترد", ZH: "浏览并兑换", DE: "Durchsuchen und einlösen", JA: "閲覧して交換", RU: "Просмотреть и обменять" },
  "beta_task.student.5.desc": { EN: "Browse catalog and redeem a reward", HT: "Gade katalòg epi rachte yon rekonpans", FR: "Parcourir le catalogue et échanger une récompense", ES: "Explorar catálogo y canjear una recompensa", PT: "Navegar pelo catálogo e resgatar uma recompensa", AR: "تصفح الكتالوج واسترد مكافأة", ZH: "浏览目录并兑换奖励", DE: "Katalog durchsuchen und Belohnung einlösen", JA: "カタログを閲覧して報酬を交換", RU: "Просмотреть каталог и обменять награду" },
  "beta_task.student.6.title": { EN: "View streaks", HT: "Wè seri", FR: "Voir les séries", ES: "Ver rachas", PT: "Ver sequências", AR: "عرض السلاسل", ZH: "查看连续记录", DE: "Serien anzeigen", JA: "ストリークを表示", RU: "Посмотреть серии" },
  "beta_task.student.6.desc": { EN: "View streak page and milestone badges", HT: "Wè paj seri ak badj etap", FR: "Voir la page de séries et les badges d'étapes", ES: "Ver página de rachas e insignias de hitos", PT: "Ver página de sequências e insígnias de marcos", AR: "عرض صفحة السلاسل وشارات المعالم", ZH: "查看连续记录页面和里程碑徽章", DE: "Serien-Seite und Meilenstein-Abzeichen anzeigen", JA: "ストリークページとマイルストーンバッジを表示", RU: "Посмотреть страницу серий и значки достижений" },
  "beta_task.coguardian.1.title": { EN: "Accept invite link", HT: "Aksepte lyen envitasyon", FR: "Accepter le lien d'invitation", ES: "Aceptar enlace de invitación", PT: "Aceitar link de convite", AR: "قبول رابط الدعوة", ZH: "接受邀请链接", DE: "Einladungslink akzeptieren", JA: "招待リンクを承認", RU: "Принять ссылку-приглашение" },
  "beta_task.coguardian.1.desc": { EN: "Accept a co-guardian invitation", HT: "Aksepte envitasyon ko-gadyen", FR: "Accepter une invitation de co-tuteur", ES: "Aceptar una invitación de co-tutor", PT: "Aceitar convite de co-responsável", AR: "قبول دعوة ولي مشارك", ZH: "接受共同监护人邀请", DE: "Eine Mit-Erziehungsberechtigten-Einladung akzeptieren", JA: "共同保護者の招待を承認", RU: "Принять приглашение со-опекуна" },
  "beta_task.coguardian.2.title": { EN: "View student profile", HT: "Wè pwofil elèv", FR: "Voir le profil élève", ES: "Ver perfil de estudiante", PT: "Ver perfil do aluno", AR: "عرض ملف الطالب", ZH: "查看学生资料", DE: "Schülerprofil anzeigen", JA: "生徒プロフィールを表示", RU: "Посмотреть профиль ученика" },
  "beta_task.coguardian.2.desc": { EN: "View progress of a shared student", HT: "Wè pwogrè yon elèv pataje", FR: "Voir la progression d'un élève partagé", ES: "Ver progreso de un estudiante compartido", PT: "Ver progresso de um aluno compartilhado", AR: "عرض تقدم طالب مشترك", ZH: "查看共享学生的进度", DE: "Fortschritt eines geteilten Schülers anzeigen", JA: "共有生徒の進捗を表示", RU: "Посмотреть прогресс общего ученика" },
  "beta_task.coguardian.3.title": { EN: "Check SOS inbox", HT: "Tcheke bwat SOS", FR: "Vérifier la boîte SOS", ES: "Revisar bandeja SOS", PT: "Verificar caixa SOS", AR: "فحص صندوق SOS", ZH: "检查SOS收件箱", DE: "SOS-Posteingang prüfen", JA: "SOS受信トレイを確認", RU: "Проверить SOS-входящие" },
  "beta_task.coguardian.3.desc": { EN: "Check inbox for SOS alerts", HT: "Tcheke bwat mesaj pou alèt SOS", FR: "Vérifier les alertes SOS dans la boîte de réception", ES: "Revisar alertas SOS en la bandeja", PT: "Verificar alertas SOS na caixa de entrada", AR: "فحص صندوق الوارد لتنبيهات SOS", ZH: "检查收件箱中的SOS警报", DE: "Posteingang auf SOS-Alarme prüfen", JA: "受信トレイでSOSアラートを確認", RU: "Проверить входящие на наличие SOS-оповещений" },
  "beta_task.coguardian.4.title": { EN: "Filter messages", HT: "Filtre mesaj", FR: "Filtrer les messages", ES: "Filtrar mensajes", PT: "Filtrar mensagens", AR: "تصفية الرسائل", ZH: "筛选消息", DE: "Nachrichten filtern", JA: "メッセージをフィルター", RU: "Фильтровать сообщения" },
  "beta_task.coguardian.4.desc": { EN: "Filter and mark messages read", HT: "Filtre epi make mesaj li", FR: "Filtrer et marquer les messages comme lus", ES: "Filtrar y marcar mensajes como leídos", PT: "Filtrar e marcar mensagens como lidas", AR: "تصفية ووضع علامة مقروء على الرسائل", ZH: "筛选并标记消息为已读", DE: "Nachrichten filtern und als gelesen markieren", JA: "メッセージをフィルタリングして既読にする", RU: "Фильтровать и отмечать сообщения прочитанными" },
  "beta_task.educator.1.title": { EN: "Complete onboarding", HT: "Fini anrejistreman", FR: "Terminer l'intégration", ES: "Completar incorporación", PT: "Completar integração", AR: "إكمال الإعداد", ZH: "完成入职", DE: "Onboarding abschließen", JA: "オンボーディングを完了", RU: "Завершить регистрацию" },
  "beta_task.educator.1.desc": { EN: "Complete the 5-step onboarding", HT: "Fini anrejistreman 5 etap", FR: "Terminer l'intégration en 5 étapes", ES: "Completar la incorporación de 5 pasos", PT: "Completar a integração em 5 etapas", AR: "إكمال الإعداد من 5 خطوات", ZH: "完成5步入职", DE: "Das 5-Schritte-Onboarding abschließen", JA: "5ステップのオンボーディングを完了", RU: "Завершить 5-шаговую регистрацию" },
  "beta_task.educator.2.title": { EN: "Apply template", HT: "Aplike modèl", FR: "Appliquer un modèle", ES: "Aplicar plantilla", PT: "Aplicar modelo", AR: "تطبيق قالب", ZH: "应用模板", DE: "Vorlage anwenden", JA: "テンプレートを適用", RU: "Применить шаблон" },
  "beta_task.educator.2.desc": { EN: "Apply a built-in schedule template", HT: "Aplike yon modèl orè entegre", FR: "Appliquer un modèle d'emploi du temps intégré", ES: "Aplicar una plantilla de horario integrada", PT: "Aplicar um modelo de agenda integrado", AR: "تطبيق قالب جدول مدمج", ZH: "应用内置课表模板", DE: "Eine integrierte Zeitplanvorlage anwenden", JA: "内蔵スケジュールテンプレートを適用", RU: "Применить встроенный шаблон расписания" },
  "beta_task.educator.3.title": { EN: "Ask Mr A 3 questions", HT: "Poze Mr A 3 kesyon", FR: "Poser 3 questions à Mr A", ES: "Hacer 3 preguntas a Mr A", PT: "Fazer 3 perguntas ao Mr A", AR: "اسأل Mr A 3 أسئلة", ZH: "向Mr A提3个问题", DE: "Mr A 3 Fragen stellen", JA: "Mr Aに3つ質問する", RU: "Задать Mr A 3 вопроса" },
  "beta_task.educator.3.desc": { EN: "Ask Mr A 3 questions in different subjects", HT: "Poze Mr A 3 kesyon nan diferan matyè", FR: "Poser 3 questions à Mr A dans différentes matières", ES: "Hacer 3 preguntas a Mr A en diferentes materias", PT: "Fazer 3 perguntas ao Mr A em matérias diferentes", AR: "اسأل Mr A 3 أسئلة في مواد مختلفة", ZH: "在不同科目向Mr A提3个问题", DE: "Mr A 3 Fragen in verschiedenen Fächern stellen", JA: "異なる科目でMr Aに3つ質問する", RU: "Задать Mr A 3 вопроса по разным предметам" },
  "beta_task.educator.4.title": { EN: "Download report", HT: "Telechaje rapò", FR: "Télécharger le rapport", ES: "Descargar informe", PT: "Baixar relatório", AR: "تحميل التقرير", ZH: "下载报告", DE: "Bericht herunterladen", JA: "レポートをダウンロード", RU: "Скачать отчёт" },
  "beta_task.educator.4.desc": { EN: "Download a student progress report", HT: "Telechaje yon rapò pwogrè elèv", FR: "Télécharger un rapport de progression", ES: "Descargar un informe de progreso", PT: "Baixar um relatório de progresso", AR: "تحميل تقرير تقدم الطالب", ZH: "下载学生进度报告", DE: "Einen Fortschrittsbericht herunterladen", JA: "生徒の進捗レポートをダウンロード", RU: "Скачать отчёт о прогрессе ученика" },
  "beta_task.educator.5.title": { EN: "Switch language", HT: "Chanje lang", FR: "Changer de langue", ES: "Cambiar idioma", PT: "Mudar idioma", AR: "تغيير اللغة", ZH: "切换语言", DE: "Sprache wechseln", JA: "言語を切り替え", RU: "Сменить язык" },
  "beta_task.educator.5.desc": { EN: "Switch language and explore in second language", HT: "Chanje lang epi eksplore nan dezyèm lang", FR: "Changer de langue et explorer dans une seconde langue", ES: "Cambiar idioma y explorar en un segundo idioma", PT: "Mudar idioma e explorar em um segundo idioma", AR: "غيّر اللغة واستكشف بلغة ثانية", ZH: "切换语言并用第二语言探索", DE: "Sprache wechseln und in einer zweiten Sprache erkunden", JA: "言語を切り替えて第2言語で探索", RU: "Сменить язык и исследовать на втором языке" },

  // ── Invite Panel ──
  "invite_panel.title": { EN: "Invite a tester", HT: "Envite yon testè", FR: "Inviter un testeur", ES: "Invitar un tester", PT: "Convidar um testador", AR: "دعوة مختبر", ZH: "邀请测试员", DE: "Tester einladen", JA: "テスターを招待", RU: "Пригласить тестировщика" },
  "invite_panel.name": { EN: "Tester's name", HT: "Non testè a", FR: "Nom du testeur", ES: "Nombre del tester", PT: "Nome do testador", AR: "اسم المختبر", ZH: "测试员姓名", DE: "Name des Testers", JA: "テスター名", RU: "Имя тестировщика" },
  "invite_panel.email": { EN: "Email address", HT: "Adrès imèl", FR: "Adresse courriel", ES: "Correo electrónico", PT: "Endereço de e-mail", AR: "عنوان البريد الإلكتروني", ZH: "电子邮箱", DE: "E-Mail-Adresse", JA: "メールアドレス", RU: "Адрес email" },
  "invite_panel.phone": { EN: "Phone number", HT: "Nimewo telefòn", FR: "Numéro de téléphone", ES: "Número de teléfono", PT: "Número de telefone", AR: "رقم الهاتف", ZH: "电话号码", DE: "Telefonnummer", JA: "電話番号", RU: "Номер телефона" },
  "invite_panel.phone_hint": { EN: "Required for SMS and WhatsApp", HT: "Obligatwa pou SMS ak WhatsApp", FR: "Requis pour SMS et WhatsApp", ES: "Requerido para SMS y WhatsApp", PT: "Necessário para SMS e WhatsApp", AR: "مطلوب للرسائل القصيرة وواتساب", ZH: "SMS和WhatsApp需要", DE: "Erforderlich für SMS und WhatsApp", JA: "SMSとWhatsAppに必要", RU: "Требуется для SMS и WhatsApp" },
  "invite_panel.tester_type": { EN: "Tester type", HT: "Tip testè", FR: "Type de testeur", ES: "Tipo de tester", PT: "Tipo de testador", AR: "نوع المختبر", ZH: "测试员类型", DE: "Tester-Typ", JA: "テスタータイプ", RU: "Тип тестировщика" },
  "invite_panel.language": { EN: "Preferred language", HT: "Lang prefere", FR: "Langue préférée", ES: "Idioma preferido", PT: "Idioma preferido", AR: "اللغة المفضلة", ZH: "首选语言", DE: "Bevorzugte Sprache", JA: "希望言語", RU: "Предпочтительный язык" },
  "invite_panel.notes": { EN: "Personal note (optional)", HT: "Nòt pèsonèl (opsyonèl)", FR: "Note personnelle (optionnel)", ES: "Nota personal (opcional)", PT: "Nota pessoal (opcional)", AR: "ملاحظة شخصية (اختياري)", ZH: "个人备注（可选）", DE: "Persönliche Notiz (optional)", JA: "個人メモ（任意）", RU: "Личная заметка (необязательно)" },
  "invite_panel.send_via": { EN: "Send via", HT: "Voye pa", FR: "Envoyer via", ES: "Enviar por", PT: "Enviar por", AR: "إرسال عبر", ZH: "发送方式", DE: "Senden über", JA: "送信方法", RU: "Отправить через" },
  "invite_panel.channel_email": { EN: "Email", HT: "Imèl", FR: "Courriel", ES: "Correo", PT: "E-mail", AR: "بريد إلكتروني", ZH: "电子邮件", DE: "E-Mail", JA: "メール", RU: "Email" },
  "invite_panel.channel_sms": { EN: "Text message", HT: "Mesaj tèks", FR: "SMS", ES: "Mensaje de texto", PT: "Mensagem de texto", AR: "رسالة نصية", ZH: "短信", DE: "SMS", JA: "テキストメッセージ", RU: "SMS" },
  "invite_panel.channel_whatsapp": { EN: "WhatsApp", HT: "WhatsApp", FR: "WhatsApp", ES: "WhatsApp", PT: "WhatsApp", AR: "واتساب", ZH: "WhatsApp", DE: "WhatsApp", JA: "WhatsApp", RU: "WhatsApp" },
  "invite_panel.channel_telegram": { EN: "Telegram", HT: "Telegram", FR: "Telegram", ES: "Telegram", PT: "Telegram", AR: "تيليجرام", ZH: "Telegram", DE: "Telegram", JA: "Telegram", RU: "Telegram" },
  "invite_panel.channel_copy": { EN: "Copy link only", HT: "Kopye lyen sèlman", FR: "Copier le lien uniquement", ES: "Copiar enlace solamente", PT: "Copiar link apenas", AR: "نسخ الرابط فقط", ZH: "仅复制链接", DE: "Nur Link kopieren", JA: "リンクのみコピー", RU: "Только скопировать ссылку" },
  "invite_panel.preview_title": { EN: "Message preview", HT: "Apèsi mesaj", FR: "Aperçu du message", ES: "Vista previa del mensaje", PT: "Prévia da mensagem", AR: "معاينة الرسالة", ZH: "消息预览", DE: "Nachrichtenvorschau", JA: "メッセージプレビュー", RU: "Предпросмотр сообщения" },
  "invite_panel.send_btn": { EN: "Send invite", HT: "Voye envitasyon", FR: "Envoyer l'invitation", ES: "Enviar invitación", PT: "Enviar convite", AR: "إرسال الدعوة", ZH: "发送邀请", DE: "Einladung senden", JA: "招待を送信", RU: "Отправить приглашение" },
  "invite_panel.sending": { EN: "Sending...", HT: "Ap voye...", FR: "Envoi en cours...", ES: "Enviando...", PT: "Enviando...", AR: "جارٍ الإرسال...", ZH: "发送中...", DE: "Wird gesendet...", JA: "送信中...", RU: "Отправка..." },
  "invite_panel.success": { EN: "Invite sent!", HT: "Envitasyon voye!", FR: "Invitation envoyée !", ES: "¡Invitación enviada!", PT: "Convite enviado!", AR: "تم إرسال الدعوة!", ZH: "邀请已发送！", DE: "Einladung gesendet!", JA: "招待を送信しました！", RU: "Приглашение отправлено!" },
  "invite_panel.success_copy": { EN: "Link copied!", HT: "Lyen kopye!", FR: "Lien copié !", ES: "¡Enlace copiado!", PT: "Link copiado!", AR: "تم نسخ الرابط!", ZH: "链接已复制！", DE: "Link kopiert!", JA: "リンクをコピーしました！", RU: "Ссылка скопирована!" },
  "invite_panel.error_no_channel": { EN: "Select at least one channel.", HT: "Chwazi omwen yon kanal.", FR: "Sélectionnez au moins un canal.", ES: "Selecciona al menos un canal.", PT: "Selecione pelo menos um canal.", AR: "اختر قناة واحدة على الأقل.", ZH: "至少选择一个渠道。", DE: "Wählen Sie mindestens einen Kanal.", JA: "少なくとも1つのチャネルを選択してください。", RU: "Выберите хотя бы один канал." },
  "invite_panel.error_phone_required": { EN: "Phone required for SMS/WhatsApp.", HT: "Nimewo telefòn obligatwa pou SMS/WhatsApp.", FR: "Téléphone requis pour SMS/WhatsApp.", ES: "Teléfono requerido para SMS/WhatsApp.", PT: "Telefone necessário para SMS/WhatsApp.", AR: "الهاتف مطلوب للرسائل القصيرة/واتساب.", ZH: "SMS/WhatsApp需要电话号码。", DE: "Telefon für SMS/WhatsApp erforderlich.", JA: "SMS/WhatsAppには電話番号が必要です。", RU: "Для SMS/WhatsApp нужен телефон." },
  "invite_panel.error_invalid_phone": { EN: "Use E.164 format (e.g. +15091234567).", HT: "Itilize fòma E.164 (egz. +15091234567).", FR: "Utilisez le format E.164 (ex. +15091234567).", ES: "Usa formato E.164 (ej. +15091234567).", PT: "Use formato E.164 (ex. +15091234567).", AR: "استخدم تنسيق E.164 (مثال: +15091234567).", ZH: "使用E.164格式（例如 +15091234567）。", DE: "Verwenden Sie das E.164-Format (z.B. +15091234567).", JA: "E.164形式を使用してください（例：+15091234567）。", RU: "Используйте формат E.164 (напр. +15091234567)." },
  "invite_panel.resend": { EN: "Resend invite", HT: "Revoye envitasyon", FR: "Renvoyer l'invitation", ES: "Reenviar invitación", PT: "Reenviar convite", AR: "إعادة إرسال الدعوة", ZH: "重新发送邀请", DE: "Einladung erneut senden", JA: "招待を再送信", RU: "Повторно отправить приглашение" },
  "invite_panel.revoke": { EN: "Revoke access", HT: "Retire aksè", FR: "Révoquer l'accès", ES: "Revocar acceso", PT: "Revogar acesso", AR: "إلغاء الوصول", ZH: "撤销访问", DE: "Zugriff widerrufen", JA: "アクセスを取り消す", RU: "Отозвать доступ" },
  "invite_panel.bulk_title": { EN: "Bulk invite", HT: "Envitasyon an gwo", FR: "Invitation en masse", ES: "Invitación masiva", PT: "Convite em massa", AR: "دعوة جماعية", ZH: "批量邀请", DE: "Masseneinladung", JA: "一括招待", RU: "Массовое приглашение" },
  "invite_panel.bulk_placeholder": { EN: "One email per line...", HT: "Yon imèl pa liy...", FR: "Un courriel par ligne...", ES: "Un correo por línea...", PT: "Um e-mail por linha...", AR: "بريد إلكتروني واحد لكل سطر...", ZH: "每行一个邮箱...", DE: "Eine E-Mail pro Zeile...", JA: "1行に1つのメール...", RU: "По одному email в строке..." },
  "invite_panel.bulk_send": { EN: "Send invites", HT: "Voye envitasyon", FR: "Envoyer les invitations", ES: "Enviar invitaciones", PT: "Enviar convites", AR: "إرسال الدعوات", ZH: "发送邀请", DE: "Einladungen senden", JA: "招待を送信", RU: "Отправить приглашения" },
  "invite_panel.expires_in": { EN: "Expires in 14 days", HT: "Ekspire nan 14 jou", FR: "Expire dans 14 jours", ES: "Expira en 14 días", PT: "Expira em 14 dias", AR: "تنتهي خلال 14 يوماً", ZH: "14天后过期", DE: "Läuft in 14 Tagen ab", JA: "14日で期限切れ", RU: "Истекает через 14 дней" },
  "invite_panel.copied": { EN: "Copied!", HT: "Kopye!", FR: "Copié !", ES: "¡Copiado!", PT: "Copiado!", AR: "تم النسخ!", ZH: "已复制！", DE: "Kopiert!", JA: "コピーしました！", RU: "Скопировано!" },
  "invite_panel.telegram_hint": { EN: "Tester must have Telegram installed.", HT: "Testè a dwe gen Telegram enstale.", FR: "Le testeur doit avoir Telegram installé.", ES: "El tester debe tener Telegram instalado.", PT: "O testador deve ter o Telegram instalado.", AR: "يجب أن يكون لدى المختبر Telegram مثبتاً.", ZH: "测试员必须安装了Telegram。", DE: "Der Tester muss Telegram installiert haben.", JA: "テスターにはTelegramが必要です。", RU: "У тестировщика должен быть установлен Telegram." },

  // ── Currency & Wallet ──
  "currency.title": { EN: "Currency Settings", HT: "Paramèt Lajan", FR: "Paramètres de devise", ES: "Configuración de moneda", PT: "Configurações de moeda", AR: "إعدادات العملة", ZH: "货币设置", DE: "Währungseinstellungen", JA: "通貨設定", RU: "Настройки валюты" },
  "currency.label": { EN: "Currency", HT: "Lajan", FR: "Devise", ES: "Moneda", PT: "Moeda", AR: "العملة", ZH: "货币", DE: "Währung", JA: "通貨", RU: "Валюта" },
  "currency.pointsPerUnit": { EN: "Points per 1 currency unit", HT: "Pwen pou 1 inite lajan", FR: "Points par unité", ES: "Puntos por unidad", PT: "Pontos por unidade", AR: "نقاط لكل وحدة", ZH: "每单位积分", DE: "Punkte pro Einheit", JA: "1通貨単位あたりのポイント", RU: "Очков за единицу" },
  "currency.example": { EN: "Example: 500 points", HT: "Egzanp: 500 pwen", FR: "Exemple : 500 points", ES: "Ejemplo: 500 puntos", PT: "Exemplo: 500 pontos", AR: "مثال: 500 نقطة", ZH: "示例：500积分", DE: "Beispiel: 500 Punkte", JA: "例：500ポイント", RU: "Пример: 500 очков" },
  "currency.saved": { EN: "Currency settings saved!", HT: "Paramèt lajan sove!", FR: "Paramètres de devise enregistrés !", ES: "¡Configuración de moneda guardada!", PT: "Configurações de moeda salvas!", AR: "تم حفظ إعدادات العملة!", ZH: "货币设置已保存！", DE: "Währungseinstellungen gespeichert!", JA: "通貨設定を保存しました！", RU: "Настройки валюты сохранены!" },
  "currency.saveBtn": { EN: "Save Settings", HT: "Anrejistre", FR: "Enregistrer", ES: "Guardar", PT: "Salvar", AR: "حفظ", ZH: "保存设置", DE: "Speichern", JA: "設定を保存", RU: "Сохранить" },
  "currency.pts": { EN: "pts", HT: "pwen", FR: "pts", ES: "pts", PT: "pts", AR: "نقاط", ZH: "分", DE: "Pkt", JA: "pt", RU: "очк" },
  "currency.notConfigured": { EN: "Currency not set up yet. Ask your parent to configure it!", HT: "Paran ou poko konfigire lajan. Mande yo pou fè sa!", FR: "Devise non configurée. Demandez à votre parent !", ES: "Moneda no configurada. ¡Pídele a tu padre!", PT: "Moeda não configurada. Peça ao seu responsável!", AR: "العملة غير مُعدّة. اطلب من والدك إعدادها!", ZH: "货币未设置，请让家长配置！", DE: "Währung nicht eingerichtet. Bitten Sie Ihre Eltern!", JA: "通貨が未設定です。保護者に設定を依頼してください！", RU: "Валюта не настроена. Попросите родителя настроить!" },

  "wallet.title": { EN: "Digital Wallet", HT: "Balans Dijital", FR: "Portefeuille numérique", ES: "Billetera digital", PT: "Carteira digital", AR: "المحفظة الرقمية", ZH: "数字钱包", DE: "Digitale Geldbörse", JA: "デジタルウォレット", RU: "Цифровой кошелёк" },
  "wallet.points": { EN: "points", HT: "pwen", FR: "points", ES: "puntos", PT: "pontos", AR: "نقاط", ZH: "积分", DE: "Punkte", JA: "ポイント", RU: "очков" },
  "wallet.issueCheck": { EN: "Issue Digital Check", HT: "Kreye Chèk Dijital", FR: "Émettre un chèque numérique", ES: "Emitir cheque digital", PT: "Emitir cheque digital", AR: "إصدار شيك رقمي", ZH: "签发数字支票", DE: "Digitalen Scheck ausstellen", JA: "デジタル小切手を発行", RU: "Выпустить цифровой чек" },
  "wallet.checkIssued": { EN: "Digital check issued! 🎉", HT: "Chèk dijital kreye!", FR: "Chèque numérique émis ! 🎉", ES: "¡Cheque digital emitido! 🎉", PT: "Cheque digital emitido! 🎉", AR: "تم إصدار الشيك الرقمي! 🎉", ZH: "数字支票已签发！🎉", DE: "Digitaler Scheck ausgestellt! 🎉", JA: "デジタル小切手を発行しました！🎉", RU: "Цифровой чек выпущен! 🎉" },

  "check.title": { EN: "Digital Checks", HT: "Chèk Dijital", FR: "Chèques numériques", ES: "Cheques digitales", PT: "Cheques digitais", AR: "شيكات رقمية", ZH: "数字支票", DE: "Digitale Schecks", JA: "デジタル小切手", RU: "Цифровые чеки" },
  "check.active": { EN: "Active", HT: "Aktif", FR: "Actif", ES: "Activo", PT: "Ativo", AR: "نشط", ZH: "有效", DE: "Aktiv", JA: "有効", RU: "Активный" },
  "check.redeemed": { EN: "Redeemed", HT: "Itilize", FR: "Utilisé", ES: "Canjeado", PT: "Resgatado", AR: "مُسترد", ZH: "已兑换", DE: "Eingelöst", JA: "使用済み", RU: "Использован" },
  "check.markRedeemed": { EN: "Mark as Redeemed", HT: "Make kòm Itilize", FR: "Marquer comme utilisé", ES: "Marcar como canjeado", PT: "Marcar como resgatado", AR: "وضع علامة مُسترد", ZH: "标记为已兑换", DE: "Als eingelöst markieren", JA: "使用済みにする", RU: "Отметить использованным" },
  "check.download": { EN: "Download check", HT: "Telechaje chèk", FR: "Télécharger le chèque", ES: "Descargar cheque", PT: "Baixar cheque", AR: "تحميل الشيك", ZH: "下载支票", DE: "Scheck herunterladen", JA: "小切手をダウンロード", RU: "Скачать чек" },
  "check.memo": { EN: "Education reward", HT: "Rekonpans edikasyon", FR: "Récompense éducative", ES: "Recompensa educativa", PT: "Recompensa educacional", AR: "مكافأة تعليمية", ZH: "教育奖励", DE: "Bildungsbelohnung", JA: "教育報酬", RU: "Учебная награда" },
  "check.redeemSuccess": { EN: "Check marked as redeemed!", HT: "Chèk make kòm itilize!", FR: "Chèque marqué comme utilisé !", ES: "¡Cheque marcado como canjeado!", PT: "Cheque marcado como resgatado!", AR: "تم وضع علامة على الشيك كمُسترد!", ZH: "支票已标记为已兑换！", DE: "Scheck als eingelöst markiert!", JA: "小切手を使用済みにしました！", RU: "Чек отмечен как использованный!" },
  "check.history": { EN: "Check History", HT: "Istwa Chèk", FR: "Historique des chèques", ES: "Historial de cheques", PT: "Histórico de cheques", AR: "سجل الشيكات", ZH: "支票历史", DE: "Scheck-Verlauf", JA: "小切手履歴", RU: "История чеков" },

  "file.attached": { EN: "File attached", HT: "Fichye ajoute", FR: "Fichier joint", ES: "Archivo adjunto", PT: "Arquivo anexado", AR: "ملف مرفق", ZH: "已附加文件", DE: "Datei angehängt", JA: "ファイル添付済み", RU: "Файл прикреплён" },
  "file.tooLarge": { EN: "File too large (max 10MB)", HT: "Fichye a twò gwo (maks 10MB)", FR: "Fichier trop volumineux (max 10 Mo)", ES: "Archivo muy grande (máx 10MB)", PT: "Arquivo muito grande (máx 10MB)", AR: "الملف كبير جداً (الحد 10 ميجا)", ZH: "文件太大（最大10MB）", DE: "Datei zu groß (max 10MB)", JA: "ファイルが大きすぎます（最大10MB）", RU: "Файл слишком большой (макс 10МБ)" },
  "file.unsupported": { EN: "This file type is not supported", HT: "Tip fichye sa a pa sipòte", FR: "Ce type de fichier n'est pas pris en charge", ES: "Este tipo de archivo no es compatible", PT: "Este tipo de arquivo não é suportado", AR: "هذا النوع من الملفات غير مدعوم", ZH: "不支持此文件类型", DE: "Dieser Dateityp wird nicht unterstützt", JA: "このファイル形式はサポートされていません", RU: "Этот тип файла не поддерживается" },
  "file.upload": { EN: "Upload a file", HT: "Voye yon fichye", FR: "Télécharger un fichier", ES: "Subir un archivo", PT: "Enviar um arquivo", AR: "رفع ملف", ZH: "上传文件", DE: "Datei hochladen", JA: "ファイルをアップロード", RU: "Загрузить файл" },
  "file.remove": { EN: "Remove file", HT: "Retire fichye", FR: "Supprimer le fichier", ES: "Eliminar archivo", PT: "Remover arquivo", AR: "إزالة الملف", ZH: "删除文件", DE: "Datei entfernen", JA: "ファイルを削除", RU: "Удалить файл" },
  "file.analyzeImage": { EN: "Analyze this image", HT: "Analize imaj sa a", FR: "Analyser cette image", ES: "Analizar esta imagen", PT: "Analisar esta imagem", AR: "تحليل هذه الصورة", ZH: "分析此图片", DE: "Dieses Bild analysieren", JA: "この画像を分析", RU: "Проанализировать изображение" },
  "file.analyzeDoc": { EN: "Analyze this document", HT: "Analize dokiman sa a", FR: "Analyser ce document", ES: "Analizar este documento", PT: "Analisar este documento", AR: "تحليل هذا المستند", ZH: "分析此文档", DE: "Dieses Dokument analysieren", JA: "この文書を分析", RU: "Проанализировать документ" },
  "file.analyzeFile": { EN: "Analyze this file", HT: "Analize fichye sa a", FR: "Analyser ce fichier", ES: "Analizar este archivo", PT: "Analisar este arquivo", AR: "تحليل هذا الملف", ZH: "分析此文件", DE: "Diese Datei analysieren", JA: "このファイルを分析", RU: "Проанализировать файл" },

  "wallet.cashOut": { EN: "Cash Out Points", HT: "Konvèti Pwen", FR: "Retirer les points", ES: "Cobrar puntos", PT: "Resgatar pontos", AR: "صرف النقاط", ZH: "兑换积分", DE: "Punkte auszahlen", JA: "ポイントを換金", RU: "Обналичить очки" },
  "wallet.cashOutDesc": { EN: "Convert your points into a digital check", HT: "Konvèti pwen ou an yon chèk dijital", FR: "Convertissez vos points en chèque numérique", ES: "Convierte tus puntos en un cheque digital", PT: "Converta seus pontos em um cheque digital", AR: "حوّل نقاطك إلى شيك رقمي", ZH: "将积分转换为数字支票", DE: "Wandeln Sie Punkte in einen digitalen Scheck um", JA: "ポイントをデジタル小切手に変換", RU: "Конвертируйте очки в цифровой чек" },
  "wallet.enterPoints": { EN: "Points to cash out", HT: "Pwen pou konvèti", FR: "Points à retirer", ES: "Puntos a cobrar", PT: "Pontos para resgatar", AR: "النقاط للصرف", ZH: "兑换积分数", DE: "Auszuzahlende Punkte", JA: "換金するポイント", RU: "Очки для обналичивания" },
  "wallet.youllGet": { EN: "You'll receive", HT: "Ou ap resevwa", FR: "Vous recevrez", ES: "Recibirás", PT: "Você receberá", AR: "ستحصل على", ZH: "你将获得", DE: "Sie erhalten", JA: "受け取り額", RU: "Вы получите" },
  "wallet.cashOutSuccess": { EN: "Check issued! Points deducted. 🎉", HT: "Chèk kreye! Pwen dedwi. 🎉", FR: "Chèque émis ! Points déduits. 🎉", ES: "¡Cheque emitido! Puntos deducidos. 🎉", PT: "Cheque emitido! Pontos deduzidos. 🎉", AR: "تم إصدار الشيك! تم خصم النقاط. 🎉", ZH: "支票已签发！积分已扣除。🎉", DE: "Scheck ausgestellt! Punkte abgezogen. 🎉", JA: "小切手を発行しました！ポイントが差し引かれました。🎉", RU: "Чек выпущен! Очки списаны. 🎉" },
  "wallet.insufficientPoints": { EN: "Not enough points!", HT: "Pa gen ase pwen!", FR: "Pas assez de points !", ES: "¡No hay suficientes puntos!", PT: "Pontos insuficientes!", AR: "نقاط غير كافية!", ZH: "积分不足！", DE: "Nicht genug Punkte!", JA: "ポイントが不足しています！", RU: "Недостаточно очков!" },
  "wallet.confirmCashOut": { EN: "Convert to Check", HT: "Konvèti an Chèk", FR: "Convertir en chèque", ES: "Convertir a cheque", PT: "Converter em cheque", AR: "تحويل إلى شيك", ZH: "转换为支票", DE: "In Scheck umwandeln", JA: "小切手に変換", RU: "Конвертировать в чек" },
  "wallet.cancel": { EN: "Cancel", HT: "Anile", FR: "Annuler", ES: "Cancelar", PT: "Cancelar", AR: "إلغاء", ZH: "取消", DE: "Abbrechen", JA: "キャンセル", RU: "Отмена" },
  "wallet.allPoints": { EN: "All points", HT: "Tout pwen", FR: "Tous les points", ES: "Todos los puntos", PT: "Todos os pontos", AR: "كل النقاط", ZH: "全部积分", DE: "Alle Punkte", JA: "全ポイント", RU: "Все очки" },

  // ── Password fields ──
  "auth.showPassword": { EN: "Show password", HT: "Montre modpas", FR: "Afficher le mot de passe", ES: "Mostrar contraseña", PT: "Mostrar senha", AR: "إظهار كلمة المرور", ZH: "显示密码", DE: "Passwort anzeigen", JA: "パスワードを表示", RU: "Показать пароль" },
  "auth.hidePassword": { EN: "Hide password", HT: "Kache modpas", FR: "Masquer le mot de passe", ES: "Ocultar contraseña", PT: "Ocultar senha", AR: "إخفاء كلمة المرور", ZH: "隐藏密码", DE: "Passwort ausblenden", JA: "パスワードを非表示", RU: "Скрыть пароль" },

  // ── Student preferred language ──
  "student.preferredLanguage": { EN: "Preferred Language", HT: "Lang Prefere", FR: "Langue préférée", ES: "Idioma preferido", PT: "Idioma preferido", AR: "اللغة المفضلة", ZH: "首选语言", DE: "Bevorzugte Sprache", JA: "希望言語", RU: "Предпочтительный язык" },

  // ── Co-guardians on student profile ──
  "student.co_guardians": { EN: "Co-Guardians", HT: "Ko-Gadyen", FR: "Co-tuteurs", ES: "Co-tutores", PT: "Co-responsáveis", AR: "أولياء مشاركون", ZH: "共同监护人", DE: "Mit-Erziehungsberechtigte", JA: "共同保護者", RU: "Со-опекуны" },
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
