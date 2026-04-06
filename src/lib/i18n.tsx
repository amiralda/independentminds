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
  "app.version": { EN: "Independent Minds EDU v4.1", HT: "Independent Minds EDU v4.1", FR: "Independent Minds EDU v4.1", ES: "Independent Minds EDU v4.1", PT: "Independent Minds EDU v4.1", AR: "Independent Minds EDU v4.1", ZH: "Independent Minds EDU v4.1", DE: "Independent Minds EDU v4.1", JA: "Independent Minds EDU v4.1", RU: "Independent Minds EDU v4.1" },

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
  "nav.progress": { EN: "Today", HT: "Jodi a", FR: "Aujourd'hui", ES: "Hoy", PT: "Hoje", AR: "اليوم", ZH: "今天", DE: "Heute", JA: "今日", RU: "Сегодня" },
  "nav.schedule": { EN: "Schedule", HT: "Orè", FR: "Horaire", ES: "Horario", PT: "Agenda", AR: "جدول", ZH: "日程", DE: "Zeitplan", JA: "スケジュール", RU: "Расписание" },
  "nav.feed": { EN: "Feed", HT: "Aktivite", FR: "Activité", ES: "Actividad", PT: "Feed", AR: "النشاط", ZH: "动态", DE: "Feed", JA: "フィード", RU: "Лента" },
  "nav.curriculum": { EN: "Curriculum", HT: "Pwogram", FR: "Programme", ES: "Currículo", PT: "Currículo", AR: "منهج", ZH: "课程", DE: "Lehrplan", JA: "カリキュラム", RU: "Учебный план" },
  "nav.certificates": { EN: "Certificates", HT: "Sètifika", FR: "Certificats", ES: "Certificados", PT: "Certificados", AR: "شهادات", ZH: "证书", DE: "Zertifikate", JA: "証明書", RU: "Сертификаты" },
  "nav.reports": { EN: "Reports", HT: "Rapò", FR: "Rapports", ES: "Informes", PT: "Relatórios", AR: "تقارير", ZH: "报告", DE: "Berichte", JA: "レポート", RU: "Отчёты" },
  "nav.telegram": { EN: "Telegram", HT: "Telegram", FR: "Telegram", ES: "Telegram", PT: "Telegram", AR: "Telegram", ZH: "Telegram", DE: "Telegram", JA: "Telegram", RU: "Telegram" },
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
  "mood.good": { EN: "Good 😊", HT: "Bon 😊", FR: "Bien 😊", ES: "Bien 😊", PT: "Bom 😊", AR: "جيد 😊", ZH: "好 😊", DE: "Gut 😊", JA: "良い 😊", RU: "Хорошо 😊" },
  "mood.okay": { EN: "Okay 😐", HT: "Okay 😐", FR: "Correct 😐", ES: "Regular 😐", PT: "Ok 😐", AR: "لا بأس 😐", ZH: "还行 😐", DE: "Okay 😐", JA: "まあまあ 😐", RU: "Нормально 😐" },
  "mood.tired": { EN: "Tired 😴", HT: "Fatige 😴", FR: "Fatigué 😴", ES: "Cansado 😴", PT: "Cansado 😴", AR: "متعب 😴", ZH: "累了 😴", DE: "Müde 😴", JA: "疲れた 😴", RU: "Устал 😴" },
  "focus.high": { EN: "High 🔥", HT: "Wo 🔥", FR: "Élevée 🔥", ES: "Alta 🔥", PT: "Alta 🔥", AR: "عالي 🔥", ZH: "高 🔥", DE: "Hoch 🔥", JA: "高い 🔥", RU: "Высокая 🔥" },
  "focus.medium": { EN: "Medium ⚡", HT: "Mwayen ⚡", FR: "Moyenne ⚡", ES: "Media ⚡", PT: "Média ⚡", AR: "متوسط ⚡", ZH: "中 ⚡", DE: "Mittel ⚡", JA: "中 ⚡", RU: "Средняя ⚡" },
  "focus.low": { EN: "Low 🐢", HT: "Ba 🐢", FR: "Basse 🐢", ES: "Baja 🐢", PT: "Baixa 🐢", AR: "منخفض 🐢", ZH: "低 🐢", DE: "Niedrig 🐢", JA: "低い 🐢", RU: "Низкая 🐢" },

  // Check-in
  "checkin.mood": { EN: "How are you feeling?", HT: "Kijan ou santi ou?", FR: "Comment vous sentez-vous?", ES: "¿Cómo te sientes?", PT: "Como você está?", AR: "كيف تشعر؟", ZH: "你感觉怎么样？", DE: "Wie fühlst du dich?", JA: "気分はどうですか？", RU: "Как ты себя чувствуешь?" },
  "checkin.focus": { EN: "How is your focus?", HT: "Kijan konsantrasyon ou ye?", FR: "Comment est votre concentration?", ES: "¿Cómo es tu concentración?", PT: "Como está seu foco?", AR: "كيف تركيزك؟", ZH: "你的专注力如何？", DE: "Wie ist deine Konzentration?", JA: "集中力はどうですか？", RU: "Как с концентрацией?" },
  "checkin.needHelp": { EN: "Do you need help?", HT: "Èske ou bezwen èd?", FR: "Avez-vous besoin d'aide?", ES: "¿Necesitas ayuda?", PT: "Precisa de ajuda?", AR: "هل تحتاج مساعدة؟", ZH: "你需要帮助吗？", DE: "Brauchst du Hilfe?", JA: "助けが必要ですか？", RU: "Нужна помощь?" },
  "checkin.comment": { EN: "Any comments?", HT: "Kòmantè?", FR: "Des commentaires?", ES: "¿Algún comentario?", PT: "Comentários?", AR: "أي تعليقات؟", ZH: "有什么意见？", DE: "Kommentare?", JA: "コメントは？", RU: "Комментарии?" },
  "checkin.submit": { EN: "Submit Check-In", HT: "Soumèt Tcheke", FR: "Soumettre le pointage", ES: "Enviar registro", PT: "Enviar check-in", AR: "إرسال التسجيل", ZH: "提交签到", DE: "Check-In absenden", JA: "チェックインを送信", RU: "Отправить отметку" },
  "checkin.success": { EN: "Check-in submitted!", HT: "Tcheke soumèt!", FR: "Pointage soumis!", ES: "¡Registro enviado!", PT: "Check-in enviado!", AR: "تم إرسال التسجيل!", ZH: "签到已提交！", DE: "Check-In eingereicht!", JA: "チェックイン送信済み！", RU: "Отметка отправлена!" },

  // Badges
  "badge.champion": { EN: "🏆 Champion of the Week!", HT: "🏆 Chanpyon Semèn nan!", FR: "🏆 Champion de la semaine !", ES: "🏆 ¡Campeón de la semana!", PT: "🏆 Campeão da semana!", AR: "🏆 بطل الأسبوع!", ZH: "🏆 本周冠军！", DE: "🏆 Champion der Woche!", JA: "🏆 今週のチャンピオン！", RU: "🏆 Чемпион недели!" },
  "badge.goldStar": { EN: "⭐ Gold Star!", HT: "⭐ Zetwal Lò!", FR: "⭐ Étoile d'or !", ES: "⭐ ¡Estrella de oro!", PT: "⭐ Estrela de ouro!", AR: "⭐ نجمة ذهبية!", ZH: "⭐ 金星！", DE: "⭐ Goldstern!", JA: "⭐ ゴールドスター！", RU: "⭐ Золотая звезда!" },
  "badge.keepGoing": { EN: "💪 Keep Going!", HT: "💪 Kontinye!", FR: "💪 Continuez !", ES: "💪 ¡Sigue adelante!", PT: "💪 Continue!", AR: "💪 استمر!", ZH: "💪 继续加油！", DE: "💪 Weiter so!", JA: "💪 頑張って！", RU: "💪 Продолжай!" },
  "badge.newWeek": { EN: "🔄 New Week, New Start!", HT: "🔄 Nouvo Semèn, Nouvo Kòmansman!", FR: "🔄 Nouvelle semaine, nouveau départ !", ES: "🔄 ¡Nueva semana, nuevo comienzo!", PT: "🔄 Nova semana, novo começo!", AR: "🔄 أسبوع جديد، بداية جديدة!", ZH: "🔄 新的一周，新的开始！", DE: "🔄 Neue Woche, neuer Anfang!", JA: "🔄 新しい週、新しいスタート！", RU: "🔄 Новая неделя, новое начало!" },

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
  "blocks.done": { EN: "Blocks Done", HT: "Blòk Fini", FR: "Blocs terminés", ES: "Bloques hechos", PT: "Blocos feitos", AR: "الكتل المنجزة", ZH: "已完成区块", DE: "Erledigte Blöcke", JA: "完了ブロック", RU: "Блоков выполнено" },
  "rating": { EN: "How did it go? (1-5)", HT: "Kijan sa te ale? (1-5)", FR: "Comment ça s'est passé ? (1-5)", ES: "¿Cómo fue? (1-5)", PT: "Como foi? (1-5)", AR: "كيف سارت الأمور؟ (1-5)", ZH: "进展如何？(1-5)", DE: "Wie lief es? (1-5)", JA: "どうでしたか？(1-5)", RU: "Как прошло? (1-5)" },
  "score": { EN: "T4L Score (optional)", HT: "Nòt T4L (opsyonèl)", FR: "Score T4L (optionnel)", ES: "Puntuación T4L (opcional)", PT: "Nota T4L (opcional)", AR: "نتيجة T4L (اختياري)", ZH: "T4L分数（可选）", DE: "T4L-Punktzahl (optional)", JA: "T4Lスコア（任意）", RU: "Оценка T4L (необязательно)" },
  "notes": { EN: "Notes (optional)", HT: "Nòt (opsyonèl)", FR: "Notes (optionnel)", ES: "Notas (opcional)", PT: "Notas (opcional)", AR: "ملاحظات (اختياري)", ZH: "备注（可选）", DE: "Notizen (optional)", JA: "メモ（任意）", RU: "Заметки (необязательно)" },

  // Library
  "library.title": { EN: "Learning Resources", HT: "Resous Aprantisaj", FR: "Ressources d'apprentissage", ES: "Recursos de aprendizaje", PT: "Recursos de aprendizagem", AR: "موارد التعلم", ZH: "学习资源", DE: "Lernressourcen", JA: "学習リソース", RU: "Учебные ресурсы" },
  "library.t4l": { EN: "Open Time4Learning", HT: "Louvri Time4Learning", FR: "Ouvrir Time4Learning", ES: "Abrir Time4Learning", PT: "Abrir Time4Learning", AR: "فتح Time4Learning", ZH: "打开Time4Learning", DE: "Time4Learning öffnen", JA: "Time4Learningを開く", RU: "Открыть Time4Learning" },

  // Auth
  "auth.email": { EN: "Email", HT: "Imèl", FR: "Courriel", ES: "Correo", PT: "E-mail", AR: "بريد إلكتروني", ZH: "电子邮件", DE: "E-Mail", JA: "メール", RU: "Электронная почта" },
  "auth.displayName": { EN: "Display Name", HT: "Non Afichaj", FR: "Nom d'affichage", ES: "Nombre", PT: "Nome de exibição", AR: "اسم العرض", ZH: "显示名称", DE: "Anzeigename", JA: "表示名", RU: "Отображаемое имя" },
  "auth.fullName": { EN: "Full Name", HT: "Non Konplè", FR: "Nom complet", ES: "Nombre completo", PT: "Nome completo", AR: "الاسم الكامل", ZH: "全名", DE: "Vollständiger Name", JA: "氏名", RU: "Полное имя" },
  "auth.signingIn": { EN: "Signing in...", HT: "Ap konekte...", FR: "Connexion en cours...", ES: "Iniciando sesión...", PT: "Entrando...", AR: "جارٍ تسجيل الدخول...", ZH: "登录中...", DE: "Anmeldung läuft...", JA: "ログイン中...", RU: "Вход..." },
  "auth.creatingAccount": { EN: "Creating account...", HT: "Ap kreye kont...", FR: "Création du compte...", ES: "Creando cuenta...", PT: "Criando conta...", AR: "جارٍ إنشاء الحساب...", ZH: "创建账户中...", DE: "Konto wird erstellt...", JA: "アカウント作成中...", RU: "Создание аккаунта..." },
  "auth.noAccount": { EN: "Don't have an account?", HT: "Ou pa gen kont?", FR: "Pas de compte ?", ES: "¿No tienes cuenta?", PT: "Não tem conta?", AR: "ليس لديك حساب؟", ZH: "没有账户？", DE: "Kein Konto?", JA: "アカウントがありませんか？", RU: "Нет аккаунта?" },
  "auth.hasAccount": { EN: "Already have an account?", HT: "Ou gen kont deja?", FR: "Déjà un compte ?", ES: "¿Ya tienes cuenta?", PT: "Já tem conta?", AR: "لديك حساب بالفعل؟", ZH: "已有账户？", DE: "Bereits ein Konto?", JA: "すでにアカウントをお持ちですか？", RU: "Уже есть аккаунт?" },
  "auth.orContinueWith": { EN: "Or continue with", HT: "Oubyen kontinye ak", FR: "Ou continuer avec", ES: "O continuar con", PT: "Ou continuar com", AR: "أو المتابعة مع", ZH: "或继续使用", DE: "Oder weiter mit", JA: "または次で続行", RU: "Или продолжить с" },
  "auth.checkEmail": { EN: "Check your email to confirm your account!", HT: "Tcheke imèl ou pou konfime kont ou!", FR: "Vérifiez votre email pour confirmer votre compte !", ES: "¡Revisa tu correo para confirmar tu cuenta!", PT: "Verifique seu e-mail para confirmar sua conta!", AR: "تحقق من بريدك الإلكتروني لتأكيد حسابك!", ZH: "请查看邮箱确认账户！", DE: "Prüfen Sie Ihre E-Mail, um Ihr Konto zu bestätigen!", JA: "メールを確認してアカウントを認証してください！", RU: "Проверьте почту для подтверждения аккаунта!" },
  "auth.forgotPassword": { EN: "Forgot Password?", HT: "Bliye Modpas?", FR: "Mot de passe oublié ?", ES: "¿Olvidaste tu contraseña?", PT: "Esqueceu a senha?", AR: "نسيت كلمة المرور؟", ZH: "忘记密码？", DE: "Passwort vergessen?", JA: "パスワードを忘れましたか？", RU: "Забыли пароль?" },
  "auth.forgotPasswordDesc": { EN: "Enter your email and we'll send you a reset link.", HT: "Antre imèl ou epi n ap voye yon lyen pou reyinisyalize.", FR: "Entrez votre email et nous vous enverrons un lien de réinitialisation.", ES: "Ingresa tu correo y te enviaremos un enlace de restablecimiento.", PT: "Digite seu e-mail e enviaremos um link de redefinição.", AR: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.", ZH: "输入邮箱，我们将发送重置链接。", DE: "Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Reset-Link.", JA: "メールアドレスを入力すると、リセットリンクを送信します。", RU: "Введите email, и мы отправим ссылку для сброса." },
  "auth.sendResetLink": { EN: "Send Reset Link", HT: "Voye Lyen Reyinisyalize", FR: "Envoyer le lien", ES: "Enviar enlace", PT: "Enviar link", AR: "إرسال رابط إعادة التعيين", ZH: "发送重置链接", DE: "Reset-Link senden", JA: "リセットリンクを送信", RU: "Отправить ссылку" },
  "auth.sending": { EN: "Sending...", HT: "Ap voye...", FR: "Envoi...", ES: "Enviando...", PT: "Enviando...", AR: "جارٍ الإرسال...", ZH: "发送中...", DE: "Wird gesendet...", JA: "送信中...", RU: "Отправка..." },
  "auth.checkYourEmail": { EN: "Check Your Email", HT: "Tcheke Imèl Ou", FR: "Vérifiez votre email", ES: "Revisa tu correo", PT: "Verifique seu e-mail", AR: "تحقق من بريدك", ZH: "请查看邮箱", DE: "Prüfen Sie Ihre E-Mail", JA: "メールを確認", RU: "Проверьте почту" },
  "auth.resetEmailSent": { EN: "We've sent a password reset link to your email.", HT: "Nou voye yon lyen reyinisyalize modpas nan imèl ou.", FR: "Un lien de réinitialisation a été envoyé à votre email.", ES: "Hemos enviado un enlace de restablecimiento a tu correo.", PT: "Enviamos um link de redefinição para seu e-mail.", AR: "لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.", ZH: "我们已向您的邮箱发送了密码重置链接。", DE: "Wir haben einen Reset-Link an Ihre E-Mail gesendet.", JA: "パスワードリセットリンクをメールに送信しました。", RU: "Ссылка для сброса пароля отправлена на вашу почту." },
  "auth.backToLogin": { EN: "Back to Login", HT: "Retounen nan Koneksyon", FR: "Retour à la connexion", ES: "Volver al inicio de sesión", PT: "Voltar ao login", AR: "العودة لتسجيل الدخول", ZH: "返回登录", DE: "Zurück zur Anmeldung", JA: "ログインに戻る", RU: "Вернуться к входу" },
  "auth.setNewPassword": { EN: "Set New Password", HT: "Mete Nouvo Modpas", FR: "Définir un nouveau mot de passe", ES: "Establecer nueva contraseña", PT: "Definir nova senha", AR: "تعيين كلمة مرور جديدة", ZH: "设置新密码", DE: "Neues Passwort festlegen", JA: "新しいパスワードを設定", RU: "Установить новый пароль" },
  "auth.newPassword": { EN: "New Password", HT: "Nouvo Modpas", FR: "Nouveau mot de passe", ES: "Nueva contraseña", PT: "Nova senha", AR: "كلمة المرور الجديدة", ZH: "新密码", DE: "Neues Passwort", JA: "新しいパスワード", RU: "Новый пароль" },
  "auth.confirmPassword": { EN: "Confirm Password", HT: "Konfime Modpas", FR: "Confirmer le mot de passe", ES: "Confirmar contraseña", PT: "Confirmar senha", AR: "تأكيد كلمة المرور", ZH: "确认密码", DE: "Passwort bestätigen", JA: "パスワードを確認", RU: "Подтвердить пароль" },
  "auth.updatePassword": { EN: "Update Password", HT: "Mete Modpas Ajou", FR: "Mettre à jour le mot de passe", ES: "Actualizar contraseña", PT: "Atualizar senha", AR: "تحديث كلمة المرور", ZH: "更新密码", DE: "Passwort aktualisieren", JA: "パスワードを更新", RU: "Обновить пароль" },
  "auth.updating": { EN: "Updating...", HT: "Ap mete ajou...", FR: "Mise à jour...", ES: "Actualizando...", PT: "Atualizando...", AR: "جارٍ التحديث...", ZH: "更新中...", DE: "Wird aktualisiert...", JA: "更新中...", RU: "Обновление..." },
  "auth.passwordUpdated": { EN: "Password updated successfully!", HT: "Modpas mete ajou avèk siksè!", FR: "Mot de passe mis à jour !", ES: "¡Contraseña actualizada!", PT: "Senha atualizada!", AR: "تم تحديث كلمة المرور!", ZH: "密码已更新！", DE: "Passwort aktualisiert!", JA: "パスワードが更新されました！", RU: "Пароль обновлён!" },
  "auth.passwordMismatch": { EN: "Passwords do not match", HT: "Modpas yo pa menm", FR: "Les mots de passe ne correspondent pas", ES: "Las contraseñas no coinciden", PT: "As senhas não coincidem", AR: "كلمات المرور غير متطابقة", ZH: "密码不匹配", DE: "Passwörter stimmen nicht überein", JA: "パスワードが一致しません", RU: "Пароли не совпадают" },
  "auth.passwordTooShort": { EN: "Password must be at least 6 characters", HT: "Modpas dwe gen omwen 6 karaktè", FR: "Le mot de passe doit contenir au moins 6 caractères", ES: "La contraseña debe tener al menos 6 caracteres", PT: "A senha deve ter pelo menos 6 caracteres", AR: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل", ZH: "密码至少需要6个字符", DE: "Passwort muss mindestens 6 Zeichen lang sein", JA: "パスワードは6文字以上必要です", RU: "Пароль должен содержать минимум 6 символов" },
  "auth.invalidResetLink": { EN: "Invalid Reset Link", HT: "Lyen Reyinisyalize Envalid", FR: "Lien de réinitialisation invalide", ES: "Enlace de restablecimiento inválido", PT: "Link de redefinição inválido", AR: "رابط إعادة التعيين غير صالح", ZH: "重置链接无效", DE: "Ungültiger Reset-Link", JA: "無効なリセットリンク", RU: "Недействительная ссылка для сброса" },
  "auth.invalidResetDesc": { EN: "This link is invalid or has expired. Please request a new one.", HT: "Lyen sa a envalid oswa li ekspire. Tanpri mande yon nouvo.", FR: "Ce lien est invalide ou a expiré. Veuillez en demander un nouveau.", ES: "Este enlace es inválido o ha expirado. Solicita uno nuevo.", PT: "Este link é inválido ou expirou. Solicite um novo.", AR: "هذا الرابط غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد.", ZH: "此链接无效或已过期。请申请新链接。", DE: "Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.", JA: "このリンクは無効か期限切れです。新しいリンクを申請してください。", RU: "Эта ссылка недействительна или истекла. Запросите новую." },

  // Welcome Modal
  "welcome.title": { EN: "Welcome to Independent Minds! 🎓", HT: "Byenvini nan Independent Minds! 🎓", FR: "Bienvenue sur Independent Minds ! 🎓", ES: "¡Bienvenido a Independent Minds! 🎓", PT: "Bem-vindo ao Independent Minds! 🎓", AR: "مرحبًا بك في Independent Minds! 🎓", ZH: "欢迎来到 Independent Minds！🎓", DE: "Willkommen bei Independent Minds! 🎓", JA: "Independent Mindsへようこそ！🎓", RU: "Добро пожаловать в Independent Minds! 🎓" },
  "welcome.subtitle": { EN: "Let's set up your learning environment.", HT: "Ann konfigire anviwònman aprantisaj ou.", FR: "Configurons votre environnement d'apprentissage.", ES: "Configuremos tu entorno de aprendizaje.", PT: "Vamos configurar seu ambiente de aprendizagem.", AR: "لنقم بإعداد بيئة التعلم الخاصة بك.", ZH: "让我们设置您的学习环境。", DE: "Richten wir Ihre Lernumgebung ein.", JA: "学習環境を設定しましょう。", RU: "Давайте настроим вашу учебную среду." },
  "welcome.addFirst": { EN: "Start by adding your first student", HT: "Kòmanse pa ajoute premye elèv ou", FR: "Commencez par ajouter votre premier élève", ES: "Comienza agregando tu primer estudiante", PT: "Comece adicionando seu primeiro aluno", AR: "ابدأ بإضافة أول طالب", ZH: "从添加第一个学生开始", DE: "Beginnen Sie mit dem Hinzufügen Ihres ersten Schülers", JA: "最初の生徒を追加して始めましょう", RU: "Начните с добавления первого ученика" },
  "welcome.getStarted": { EN: "Get Started", HT: "Kòmanse", FR: "Commencer", ES: "Comenzar", PT: "Começar", AR: "ابدأ", ZH: "开始", DE: "Loslegen", JA: "始める", RU: "Начать" },

  // Student management
  "student.name": { EN: "Student Name", HT: "Non Elèv", FR: "Nom de l'élève", ES: "Nombre del estudiante", PT: "Nome do aluno", AR: "اسم الطالب", ZH: "学生姓名", DE: "Schülername", JA: "生徒名", RU: "Имя ученика" },
  "student.id": { EN: "Student ID", HT: "ID Elèv", FR: "ID élève", ES: "ID del estudiante", PT: "ID do aluno", AR: "معرف الطالب", ZH: "学生ID", DE: "Schüler-ID", JA: "生徒ID", RU: "ID ученика" },
  "student.grade": { EN: "Grade Level", HT: "Nivo Klas", FR: "Niveau scolaire", ES: "Nivel escolar", PT: "Nível escolar", AR: "المستوى الدراسي", ZH: "年级", DE: "Klassenstufe", JA: "学年", RU: "Уровень класса" },
  "student.noStudents": { EN: "No students yet", HT: "Pa gen elèv ankò", FR: "Aucun élève pour le moment", ES: "Aún no hay estudiantes", PT: "Nenhum aluno ainda", AR: "لا يوجد طلاب بعد", ZH: "还没有学生", DE: "Noch keine Schüler", JA: "まだ生徒がいません", RU: "Учеников пока нет" },
  "student.addDescription": { EN: "Add your first student to get started!", HT: "Ajoute premye elèv ou pou kòmanse!", FR: "Ajoutez votre premier élève pour commencer !", ES: "¡Agrega tu primer estudiante para comenzar!", PT: "Adicione seu primeiro aluno para começar!", AR: "أضف أول طالب للبدء!", ZH: "添加第一个学生开始吧！", DE: "Fügen Sie Ihren ersten Schüler hinzu!", JA: "最初の生徒を追加して始めましょう！", RU: "Добавьте первого ученика, чтобы начать!" },
  "student.created": { EN: "Student added with default tracks!", HT: "Elèv ajoute ak pis pa defo!", FR: "Élève ajouté avec les pistes par défaut !", ES: "¡Estudiante agregado con pistas predeterminadas!", PT: "Aluno adicionado com trilhas padrão!", AR: "تمت إضافة الطالب بالمسارات الافتراضية!", ZH: "学生已添加默认学习轨道！", DE: "Schüler mit Standard-Kursen hinzugefügt!", JA: "デフォルトトラックで生徒を追加しました！", RU: "Ученик добавлен с треками по умолчанию!" },

  // Tracks
  "tracks.title": { EN: "Learning Tracks", HT: "Pis Aprantisaj", FR: "Pistes d'apprentissage", ES: "Pistas de aprendizaje", PT: "Trilhas de aprendizagem", AR: "مسارات التعلم", ZH: "学习轨道", DE: "Lernkurse", JA: "学習トラック", RU: "Учебные треки" },
  "tracks.addTrack": { EN: "Add Track", HT: "Ajoute Pis", FR: "Ajouter une piste", ES: "Agregar pista", PT: "Adicionar trilha", AR: "إضافة مسار", ZH: "添加轨道", DE: "Kurs hinzufügen", JA: "トラックを追加", RU: "Добавить трек" },
  "tracks.editTrack": { EN: "Edit Track", HT: "Modifye Pis", FR: "Modifier la piste", ES: "Editar pista", PT: "Editar trilha", AR: "تعديل المسار", ZH: "编辑轨道", DE: "Kurs bearbeiten", JA: "トラックを編集", RU: "Изменить трек" },
  "tracks.newTrack": { EN: "New Learning Track", HT: "Nouvo Pis Aprantisaj", FR: "Nouvelle piste d'apprentissage", ES: "Nueva pista de aprendizaje", PT: "Nova trilha de aprendizagem", AR: "مسار تعلم جديد", ZH: "新学习轨道", DE: "Neuer Lernkurs", JA: "新しい学習トラック", RU: "Новый учебный трек" },
  "tracks.name": { EN: "Track Name", HT: "Non Pis", FR: "Nom de la piste", ES: "Nombre de la pista", PT: "Nome da trilha", AR: "اسم المسار", ZH: "轨道名称", DE: "Kursname", JA: "トラック名", RU: "Название трека" },
  "tracks.category": { EN: "Category", HT: "Kategori", FR: "Catégorie", ES: "Categoría", PT: "Categoria", AR: "فئة", ZH: "类别", DE: "Kategorie", JA: "カテゴリ", RU: "Категория" },
  "tracks.dailyTarget": { EN: "Daily Target", HT: "Objektif Chak Jou", FR: "Objectif quotidien", ES: "Objetivo diario", PT: "Meta diária", AR: "الهدف اليومي", ZH: "每日目标", DE: "Tagesziel", JA: "1日の目標", RU: "Дневная цель" },
  "tracks.unitType": { EN: "Unit Type", HT: "Tip Inite", FR: "Type d'unité", ES: "Tipo de unidad", PT: "Tipo de unidade", AR: "نوع الوحدة", ZH: "单位类型", DE: "Einheitentyp", JA: "単位タイプ", RU: "Тип единицы" },
  "tracks.icon": { EN: "Icon", HT: "Ikòn", FR: "Icône", ES: "Ícono", PT: "Ícone", AR: "أيقونة", ZH: "图标", DE: "Symbol", JA: "アイコン", RU: "Иконка" },
  "tracks.color": { EN: "Color", HT: "Koulè", FR: "Couleur", ES: "Color", PT: "Cor", AR: "لون", ZH: "颜色", DE: "Farbe", JA: "色", RU: "Цвет" },
  "tracks.noTracks": { EN: "No learning tracks set up yet", HT: "Pa gen pis aprantisaj ankò", FR: "Aucune piste configurée", ES: "Aún no hay pistas configuradas", PT: "Nenhuma trilha configurada ainda", AR: "لم يتم إعداد مسارات تعلم بعد", ZH: "尚未设置学习轨道", DE: "Noch keine Lernkurse eingerichtet", JA: "まだ学習トラックが設定されていません", RU: "Учебные треки ещё не настроены" },
  "tracks.askParent": { EN: "Ask your parent to configure your learning tracks!", HT: "Mande paran ou pou konfigire pis aprantisaj ou!", FR: "Demandez à votre parent de configurer vos pistes !", ES: "¡Pídele a tu padre que configure tus pistas!", PT: "Peça ao seu responsável para configurar suas trilhas!", AR: "اطلب من والدك إعداد مسارات التعلم!", ZH: "请让家长配置学习轨道！", DE: "Bitten Sie Ihre Eltern, Ihre Lernkurse einzurichten!", JA: "保護者にトラックの設定を依頼してください！", RU: "Попросите родителя настроить учебные треки!" },
  "tracks.today": { EN: "today", HT: "jodi a", FR: "aujourd'hui", ES: "hoy", PT: "hoje", AR: "اليوم", ZH: "今天", DE: "heute", JA: "今日", RU: "сегодня" },

  // Activity Feed
  "feed.title": { EN: "Today's Activity Feed", HT: "Aktivite Jodi a", FR: "Activité du jour", ES: "Actividad de hoy", PT: "Atividades de hoje", AR: "نشاط اليوم", ZH: "今日活动", DE: "Heutige Aktivitäten", JA: "今日のアクティビティ", RU: "Активность за сегодня" },
  "feed.noActivity": { EN: "No activities logged today", HT: "Pa gen aktivite jodi a", FR: "Aucune activité enregistrée aujourd'hui", ES: "No hay actividades registradas hoy", PT: "Nenhuma atividade registrada hoje", AR: "لا أنشطة مسجلة اليوم", ZH: "今天没有活动记录", DE: "Heute keine Aktivitäten", JA: "今日の活動記録なし", RU: "Сегодня нет активности" },
  "feed.overrideTitle": { EN: "Override Activity", HT: "Korije Aktivite", FR: "Modifier l'activité", ES: "Modificar actividad", PT: "Substituir atividade", AR: "تجاوز النشاط", ZH: "覆盖活动", DE: "Aktivität überschreiben", JA: "アクティビティを上書き", RU: "Изменить активность" },
  "feed.started": { EN: "Started", HT: "Kòmanse", FR: "Commencé", ES: "Iniciado", PT: "Iniciado", AR: "بدأ", ZH: "已开始", DE: "Gestartet", JA: "開始", RU: "Начато" },
  "feed.completed": { EN: "Completed", HT: "Fini", FR: "Terminé", ES: "Completado", PT: "Concluído", AR: "مكتمل", ZH: "已完成", DE: "Abgeschlossen", JA: "完了", RU: "Завершено" },
  "feed.confirmUndo": { EN: "Remove this activity entry?", HT: "Retire antre aktivite sa a?", FR: "Supprimer cette entrée d'activité ?", ES: "¿Eliminar esta entrada de actividad?", PT: "Remover esta entrada de atividade?", AR: "إزالة هذا النشاط؟", ZH: "删除此活动记录？", DE: "Diesen Aktivitätseintrag entfernen?", JA: "このアクティビティを削除しますか？", RU: "Удалить эту запись активности?" },
  "feed.undone": { EN: "Activity entry removed", HT: "Antre retire", FR: "Entrée supprimée", ES: "Entrada eliminada", PT: "Entrada removida", AR: "تمت إزالة النشاط", ZH: "活动记录已删除", DE: "Eintrag entfernt", JA: "アクティビティが削除されました", RU: "Запись удалена" },
  "feed.overridden": { EN: "Activity overridden", HT: "Aktivite korije", FR: "Activité modifiée", ES: "Actividad modificada", PT: "Atividade substituída", AR: "تم تعديل النشاط", ZH: "活动已覆盖", DE: "Aktivität überschrieben", JA: "アクティビティが上書きされました", RU: "Активность изменена" },
  "feed.saving": { EN: "Saving...", HT: "Ap anrejistre...", FR: "Enregistrement...", ES: "Guardando...", PT: "Salvando...", AR: "جارٍ الحفظ...", ZH: "保存中...", DE: "Wird gespeichert...", JA: "保存中...", RU: "Сохранение..." },
  "feed.saveOverride": { EN: "Save Override", HT: "Anrejistre", FR: "Enregistrer la modification", ES: "Guardar modificación", PT: "Salvar substituição", AR: "حفظ التعديل", ZH: "保存覆盖", DE: "Änderung speichern", JA: "上書きを保存", RU: "Сохранить изменение" },
  "feed.failed": { EN: "Failed", HT: "Echèk", FR: "Échec", ES: "Error", PT: "Falhou", AR: "فشل", ZH: "失败", DE: "Fehlgeschlagen", JA: "失敗", RU: "Ошибка" },
  "feed.track": { EN: "Track", HT: "Pis", FR: "Piste", ES: "Pista", PT: "Trilha", AR: "مسار", ZH: "轨道", DE: "Kurs", JA: "トラック", RU: "Трек" },
  "feed.optional": { EN: "optional", HT: "opsyonèl", FR: "optionnel", ES: "opcional", PT: "opcional", AR: "اختياري", ZH: "可选", DE: "optional", JA: "任意", RU: "необязательно" },

  // Telegram
  "telegram.title": { EN: "Telegram Notifications", HT: "Notifikasyon Telegram", FR: "Notifications Telegram", ES: "Notificaciones de Telegram", PT: "Notificações do Telegram", AR: "إشعارات Telegram", ZH: "Telegram通知", DE: "Telegram-Benachrichtigungen", JA: "Telegram通知", RU: "Уведомления Telegram" },
  "telegram.active": { EN: "Active", HT: "Aktif", FR: "Actif", ES: "Activo", PT: "Ativo", AR: "نشط", ZH: "活跃", DE: "Aktiv", JA: "有効", RU: "Активный" },
  "telegram.configure": { EN: "Configure Telegram", HT: "Konfigire Telegram", FR: "Configurer Telegram", ES: "Configurar Telegram", PT: "Configurar Telegram", AR: "إعداد Telegram", ZH: "配置Telegram", DE: "Telegram konfigurieren", JA: "Telegramを設定", RU: "Настроить Telegram" },
  "telegram.botToken": { EN: "Bot Token", HT: "Token Bot", FR: "Token du bot", ES: "Token del bot", PT: "Token do bot", AR: "رمز البوت", ZH: "Bot Token", DE: "Bot-Token", JA: "Botトークン", RU: "Токен бота" },
  "telegram.chatId": { EN: "Chat ID", HT: "ID Chat", FR: "ID de chat", ES: "ID de chat", PT: "ID do chat", AR: "معرف المحادثة", ZH: "聊天ID", DE: "Chat-ID", JA: "チャットID", RU: "ID чата" },
  "telegram.saved": { EN: "Telegram settings saved!", HT: "Paramèt Telegram sove!", FR: "Paramètres Telegram enregistrés !", ES: "¡Configuración de Telegram guardada!", PT: "Configurações do Telegram salvas!", AR: "تم حفظ إعدادات Telegram!", ZH: "Telegram设置已保存！", DE: "Telegram-Einstellungen gespeichert!", JA: "Telegram設定を保存しました！", RU: "Настройки Telegram сохранены!" },
  "telegram.test": { EN: "Test Connection", HT: "Teste Koneksyon", FR: "Tester la connexion", ES: "Probar conexión", PT: "Testar conexão", AR: "اختبار الاتصال", ZH: "测试连接", DE: "Verbindung testen", JA: "接続テスト", RU: "Проверить соединение" },
  "telegram.testSuccess": { EN: "Test message sent!", HT: "Mesaj tès voye!", FR: "Message test envoyé !", ES: "¡Mensaje de prueba enviado!", PT: "Mensagem de teste enviada!", AR: "تم إرسال رسالة الاختبار!", ZH: "测试消息已发送！", DE: "Testnachricht gesendet!", JA: "テストメッセージ送信済み！", RU: "Тестовое сообщение отправлено!" },

  // Telegram Wizard
  "telegram.wizard.step": { EN: "Step", HT: "Etap", FR: "Étape", ES: "Paso", PT: "Passo", AR: "خطوة", ZH: "步骤", DE: "Schritt", JA: "ステップ", RU: "Шаг" },
  "telegram.wizard.error": { EN: "Failed to generate link", HT: "Echèk nan kreye lyen", FR: "Échec de la génération du lien", ES: "Error al generar el enlace", PT: "Falha ao gerar link", AR: "فشل إنشاء الرابط", ZH: "生成链接失败", DE: "Link konnte nicht erstellt werden", JA: "リンクの生成に失敗", RU: "Не удалось создать ссылку" },
  "telegram.wizard.connected": { EN: "Telegram connected successfully!", HT: "Telegram konekte avèk siksè!", FR: "Telegram connecté avec succès !", ES: "¡Telegram conectado con éxito!", PT: "Telegram conectado com sucesso!", AR: "تم ربط Telegram بنجاح!", ZH: "Telegram连接成功！", DE: "Telegram erfolgreich verbunden!", JA: "Telegramが正常に接続されました！", RU: "Telegram успешно подключен!" },
  "telegram.wizard.retry": { EN: "Try again", HT: "Eseye ankò", FR: "Réessayer", ES: "Intentar de nuevo", PT: "Tentar novamente", AR: "حاول مجدداً", ZH: "重试", DE: "Erneut versuchen", JA: "再試行", RU: "Попробовать снова" },
  "telegram.wizard.step1.title": { EN: "Connect your Telegram", HT: "Konekte Telegram ou", FR: "Connectez votre Telegram", ES: "Conecta tu Telegram", PT: "Conecte seu Telegram", AR: "اربط Telegram الخاص بك", ZH: "连接你的Telegram", DE: "Verbinde dein Telegram", JA: "Telegramを接続", RU: "Подключите ваш Telegram" },
  "telegram.wizard.step1.desc": { EN: "We'll open our Telegram bot so you can receive notifications about your students' progress.", HT: "N ap ouvè bot Telegram nou pou ou ka resevwa notifikasyon sou pwogrè elèv ou yo.", FR: "Nous ouvrirons notre bot Telegram pour que vous puissiez recevoir des notifications sur les progrès de vos élèves.", ES: "Abriremos nuestro bot de Telegram para que puedas recibir notificaciones sobre el progreso de tus estudiantes.", PT: "Abriremos nosso bot do Telegram para que você receba notificações sobre o progresso de seus alunos.", AR: "سنفتح بوت Telegram الخاص بنا حتى تتمكن من تلقي إشعارات حول تقدم طلابك.", ZH: "我们将打开Telegram机器人，让您接收学生进度通知。", DE: "Wir öffnen unseren Telegram-Bot, damit du Benachrichtigungen über den Fortschritt deiner Schüler erhältst.", JA: "Telegramボットを開いて、生徒の進捗通知を受け取れるようにします。", RU: "Мы откроем нашего Telegram-бота, чтобы вы могли получать уведомления о прогрессе ваших учеников." },
  "telegram.wizard.step1.button": { EN: "Generate my link", HT: "Kreye lyen mwen", FR: "Générer mon lien", ES: "Generar mi enlace", PT: "Gerar meu link", AR: "إنشاء رابطي", ZH: "生成我的链接", DE: "Meinen Link erstellen", JA: "リンクを生成", RU: "Создать мою ссылку" },
  "telegram.wizard.step2.title": { EN: "Open Telegram & press START", HT: "Ouvè Telegram epi peze START", FR: "Ouvrez Telegram et appuyez sur START", ES: "Abre Telegram y presiona START", PT: "Abra o Telegram e pressione START", AR: "افتح Telegram واضغط START", ZH: "打开Telegram并按START", DE: "Öffne Telegram und drücke START", JA: "Telegramを開いてSTARTを押してください", RU: "Откройте Telegram и нажмите START" },
  "telegram.wizard.step2.desc": { EN: "Tap the button below to open our bot in Telegram, then press START to connect.", HT: "Tape bouton anba a pou ouvè bot nou nan Telegram, epi peze START pou konekte.", FR: "Appuyez sur le bouton ci-dessous pour ouvrir notre bot dans Telegram, puis appuyez sur START.", ES: "Toca el botón de abajo para abrir nuestro bot en Telegram, luego presiona START.", PT: "Toque o botão abaixo para abrir nosso bot no Telegram, depois pressione START.", AR: "اضغط على الزر أدناه لفتح البوت في Telegram، ثم اضغط START.", ZH: "点击下方按钮在Telegram中打开机器人，然后按START。", DE: "Tippe auf den Button unten, um unseren Bot in Telegram zu öffnen, und drücke dann START.", JA: "下のボタンをタップしてTelegramでボットを開き、STARTを押してください。", RU: "Нажмите кнопку ниже, чтобы открыть нашего бота в Telegram, затем нажмите START." },
  "telegram.wizard.step2.button": { EN: "Open in Telegram", HT: "Ouvè nan Telegram", FR: "Ouvrir dans Telegram", ES: "Abrir en Telegram", PT: "Abrir no Telegram", AR: "فتح في Telegram", ZH: "在Telegram中打开", DE: "In Telegram öffnen", JA: "Telegramで開く", RU: "Открыть в Telegram" },
  "telegram.wizard.step2.waiting": { EN: "Waiting for connection...", HT: "Ap tann koneksyon...", FR: "En attente de connexion...", ES: "Esperando conexión...", PT: "Aguardando conexão...", AR: "في انتظار الاتصال...", ZH: "等待连接中...", DE: "Warte auf Verbindung...", JA: "接続を待っています...", RU: "Ожидание подключения..." },
  "telegram.wizard.step3.title": { EN: "Telegram connected!", HT: "Telegram konekte!", FR: "Telegram connecté !", ES: "¡Telegram conectado!", PT: "Telegram conectado!", AR: "تم ربط Telegram!", ZH: "Telegram已连接！", DE: "Telegram verbunden!", JA: "Telegram接続完了！", RU: "Telegram подключен!" },
  "telegram.wizard.step3.titlePending": { EN: "Not yet connected", HT: "Poko konekte", FR: "Pas encore connecté", ES: "Aún no conectado", PT: "Ainda não conectado", AR: "لم يتم الربط بعد", ZH: "尚未连接", DE: "Noch nicht verbunden", JA: "まだ接続されていません", RU: "Ещё не подключено" },
  "telegram.wizard.step3.desc": { EN: "You'll receive notifications about badges, reports, and alerts directly in Telegram.", HT: "W ap resevwa notifikasyon sou badj, rapò, ak alèt dirèkteman nan Telegram.", FR: "Vous recevrez des notifications sur les badges, rapports et alertes directement dans Telegram.", ES: "Recibirás notificaciones sobre insignias, informes y alertas directamente en Telegram.", PT: "Você receberá notificações sobre insígnias, relatórios e alertas diretamente no Telegram.", AR: "ستتلقى إشعارات حول الشارات والتقارير والتنبيهات مباشرة في Telegram.", ZH: "您将直接在Telegram中收到徽章、报告和提醒通知。", DE: "Du erhältst Benachrichtigungen über Abzeichen, Berichte und Warnungen direkt in Telegram.", JA: "バッジ、レポート、アラートの通知をTelegramで直接受け取れます。", RU: "Вы будете получать уведомления о значках, отчётах и оповещениях прямо в Telegram." },

  // Onboarding categories
  "cat.coreAcademics": { EN: "Core Academics", HT: "Akademik Prensipal", FR: "Matières principales", ES: "Materias principales", PT: "Disciplinas principais", AR: "المواد الأساسية", ZH: "核心学科", DE: "Kernfächer", JA: "主要教科", RU: "Основные предметы" },
  "cat.languageLab": { EN: "Language Lab", HT: "Lab Lang", FR: "Laboratoire de langues", ES: "Laboratorio de idiomas", PT: "Laboratório de idiomas", AR: "مختبر اللغات", ZH: "语言实验室", DE: "Sprachlabor", JA: "語学ラボ", RU: "Языковая лаборатория" },
  "cat.techSkills": { EN: "Tech Skills", HT: "Konpetans Teknik", FR: "Compétences techniques", ES: "Habilidades técnicas", PT: "Habilidades técnicas", AR: "مهارات تقنية", ZH: "技术技能", DE: "Technische Fähigkeiten", JA: "技術スキル", RU: "Технические навыки" },
  "cat.creativeArts": { EN: "Creative Arts", HT: "A Kreyatif", FR: "Arts créatifs", ES: "Artes creativas", PT: "Artes criativas", AR: "فنون إبداعية", ZH: "创意艺术", DE: "Kreative Künste", JA: "クリエイティブアート", RU: "Творчество" },
  "cat.physicalEd": { EN: "Physical Ed", HT: "Edikasyon Fizik", FR: "Éducation physique", ES: "Educación física", PT: "Educação física", AR: "تربية بدنية", ZH: "体育", DE: "Sport", JA: "体育", RU: "Физкультура" },

  // Schedule
  "schedule.addBlock": { EN: "Add Block", HT: "Ajoute Blòk", FR: "Ajouter un bloc", ES: "Agregar bloque", PT: "Adicionar bloco", AR: "إضافة كتلة", ZH: "添加区块", DE: "Block hinzufügen", JA: "ブロックを追加", RU: "Добавить блок" },
  "schedule.editBlock": { EN: "Edit Block", HT: "Modifye Blòk", FR: "Modifier le bloc", ES: "Editar bloque", PT: "Editar bloco", AR: "تعديل الكتلة", ZH: "编辑区块", DE: "Block bearbeiten", JA: "ブロックを編集", RU: "Изменить блок" },
  "schedule.bulkUpload": { EN: "Bulk Upload", HT: "Chaje an Mas", FR: "Import en masse", ES: "Carga masiva", PT: "Upload em massa", AR: "رفع جماعي", ZH: "批量上传", DE: "Massenupload", JA: "一括アップロード", RU: "Массовая загрузка" },
  "schedule.date": { EN: "Date", HT: "Dat", FR: "Date", ES: "Fecha", PT: "Data", AR: "تاريخ", ZH: "日期", DE: "Datum", JA: "日付", RU: "Дата" },
  "schedule.start": { EN: "Start", HT: "Kòmansman", FR: "Début", ES: "Inicio", PT: "Início", AR: "بداية", ZH: "开始", DE: "Start", JA: "開始", RU: "Начало" },
  "schedule.end": { EN: "End", HT: "Fen", FR: "Fin", ES: "Fin", PT: "Fim", AR: "نهاية", ZH: "结束", DE: "Ende", JA: "終了", RU: "Конец" },
  "schedule.subject": { EN: "Subject", HT: "Matyè", FR: "Matière", ES: "Materia", PT: "Matéria", AR: "مادة", ZH: "科目", DE: "Fach", JA: "科目", RU: "Предмет" },
  "schedule.blockOrder": { EN: "Block Order", HT: "Lòd Blòk", FR: "Ordre du bloc", ES: "Orden del bloque", PT: "Ordem do bloco", AR: "ترتيب الكتلة", ZH: "区块顺序", DE: "Blockreihenfolge", JA: "ブロック順序", RU: "Порядок блока" },

  // Misc
  "loading": { EN: "Loading...", HT: "Ap chaje...", FR: "Chargement...", ES: "Cargando...", PT: "Carregando...", AR: "جارٍ التحميل...", ZH: "加载中...", DE: "Laden...", JA: "読み込み中...", RU: "Загрузка..." },
  "noAlerts": { EN: "No alerts", HT: "Pa gen alèt", FR: "Aucune alerte", ES: "Sin alertas", PT: "Sem alertas", AR: "لا تنبيهات", ZH: "无提醒", DE: "Keine Warnungen", JA: "アラートなし", RU: "Нет оповещений" },
  "helpNeeded": { EN: "Help Needed", HT: "Bezwen Èd", FR: "Aide nécessaire", ES: "Se necesita ayuda", PT: "Ajuda necessária", AR: "مساعدة مطلوبة", ZH: "需要帮助", DE: "Hilfe benötigt", JA: "助けが必要", RU: "Нужна помощь" },
  "done": { EN: "Done", HT: "Fini", FR: "Terminé", ES: "Listo", PT: "Feito", AR: "تم", ZH: "完成", DE: "Erledigt", JA: "完了", RU: "Готово" },
  "remaining": { EN: "Remaining", HT: "Rete", FR: "Restant", ES: "Restante", PT: "Restante", AR: "متبقي", ZH: "剩余", DE: "Übrig", JA: "残り", RU: "Осталось" },
  "complete": { EN: "Complete", HT: "Konplè", FR: "Complet", ES: "Completo", PT: "Completo", AR: "مكتمل", ZH: "完成", DE: "Vollständig", JA: "完了", RU: "Завершено" },
  "thisWeek": { EN: "This Week", HT: "Semèn sa a", FR: "Cette semaine", ES: "Esta semana", PT: "Esta semana", AR: "هذا الأسبوع", ZH: "本周", DE: "Diese Woche", JA: "今週", RU: "На этой неделе" },
  "streak": { EN: "Streak", HT: "Seri", FR: "Série", ES: "Racha", PT: "Sequência", AR: "سلسلة", ZH: "连续", DE: "Serie", JA: "ストリーク", RU: "Серия" },

  // Signup
  "signup.adultConfirmation": { EN: "I confirm I am 18 years of age or older and am the parent or legal guardian of the students I will manage on this platform.", HT: "Mwen konfime ke mwen gen 18 an oswa plis epi mwen se paran oswa gadyen legal elèv yo ke mwen pral jere sou platfòm sa a.", FR: "Je confirme avoir 18 ans ou plus et être le parent ou tuteur légal des élèves que je gérerai sur cette plateforme.", ES: "Confirmo que tengo 18 años o más y soy el padre o tutor legal de los estudiantes que gestionaré en esta plataforma.", PT: "Confirmo que tenho 18 anos ou mais e sou o pai ou responsável legal dos alunos que gerenciarei nesta plataforma.", AR: "أؤكد أنني أبلغ من العمر 18 عامًا أو أكثر وأنني والد أو ولي أمر الطلاب الذين سأديرهم على هذه المنصة.", ZH: "我确认我已年满18周岁，是我将在本平台管理的学生的父母或法定监护人。", DE: "Ich bestätige, dass ich 18 Jahre oder älter bin und der Elternteil oder gesetzliche Vormund der Schüler bin, die ich auf dieser Plattform verwalten werde.", JA: "私は18歳以上であり、このプラットフォームで管理する生徒の親または法的保護者であることを確認します。", RU: "Я подтверждаю, что мне 18 лет или больше, и я являюсь родителем или законным опекуном учеников, которыми буду управлять на этой платформе." },

  // Privacy & Terms
  "privacy.title": { EN: "Privacy Policy", HT: "Politik Konfidansyalite", FR: "Politique de confidentialité", ES: "Política de privacidad", PT: "Política de privacidade", AR: "سياسة الخصوصية", ZH: "隐私政策", DE: "Datenschutzrichtlinie", JA: "プライバシーポリシー", RU: "Политика конфиденциальности" },
  "terms.title": { EN: "Terms of Service", HT: "Kondisyon Sèvis", FR: "Conditions d'utilisation", ES: "Términos de servicio", PT: "Termos de serviço", AR: "شروط الخدمة", ZH: "服务条款", DE: "Nutzungsbedingungen", JA: "利用規約", RU: "Условия использования" },

  // Profile
  "profile.deleteAccount": { EN: "Delete My Account", HT: "Efase Kont Mwen", FR: "Supprimer mon compte", ES: "Eliminar mi cuenta", PT: "Excluir minha conta", AR: "حذف حسابي", ZH: "删除我的账户", DE: "Mein Konto löschen", JA: "アカウントを削除", RU: "Удалить мой аккаунт" },
  "profile.deleteAccountConfirm": { EN: "Type DELETE to confirm", HT: "Tape DELETE pou konfime", FR: "Tapez DELETE pour confirmer", ES: "Escriba DELETE para confirmar", PT: "Digite DELETE para confirmar", AR: "اكتب DELETE للتأكيد", ZH: "输入DELETE确认", DE: "Geben Sie DELETE zur Bestätigung ein", JA: "確認のためDELETEと入力", RU: "Введите DELETE для подтверждения" },

  // Offline
  "offline.indicator": { EN: "You are offline", HT: "Ou pa gen entènèt", FR: "Vous êtes hors ligne", ES: "Estás sin conexión", PT: "Você está offline", AR: "أنت غير متصل", ZH: "您已离线", DE: "Sie sind offline", JA: "オフラインです", RU: "Вы офлайн" },
  "offline.savedLocally": { EN: "Saved locally", HT: "Sove lokalman", FR: "Enregistré localement", ES: "Guardado localmente", PT: "Salvo localmente", AR: "محفوظ محلياً", ZH: "已本地保存", DE: "Lokal gespeichert", JA: "ローカル保存済み", RU: "Сохранено локально" },
  "offline.willSync": { EN: "Will sync when reconnected", HT: "Ap senkronize lè ou rekonekte", FR: "Synchronisation à la reconnexion", ES: "Se sincronizará al reconectar", PT: "Sincronizará ao reconectar", AR: "ستتم المزامنة عند إعادة الاتصال", ZH: "重新连接后将同步", DE: "Synchronisierung bei Wiederverbindung", JA: "再接続時に同期します", RU: "Синхронизируется при переподключении" },
  "offline.actionsQueued": { EN: "actions queued", HT: "aksyon nan keu", FR: "actions en file d'attente", ES: "acciones en cola", PT: "ações na fila", AR: "إجراءات في الانتظار", ZH: "排队操作", DE: "Aktionen in der Warteschlange", JA: "キューされたアクション", RU: "действий в очереди" },

  // Onboarding
  "onboarding.stepOf": { EN: "Step {current} of {total}", HT: "Etap {current} nan {total}", FR: "Étape {current} sur {total}", ES: "Paso {current} de {total}", PT: "Passo {current} de {total}", AR: "خطوة {current} من {total}", ZH: "第 {current}/{total} 步", DE: "Schritt {current} von {total}", JA: "ステップ {current}/{total}", RU: "Шаг {current} из {total}" },
  "onboarding.step.welcome": { EN: "Welcome", HT: "Byenvini", FR: "Bienvenue", ES: "Bienvenido", PT: "Bem-vindo", AR: "مرحبًا", ZH: "欢迎", DE: "Willkommen", JA: "ようこそ", RU: "Добро пожаловать" },
  "onboarding.step.verify": { EN: "Verify Email", HT: "Verifye Imèl", FR: "Vérifier l'email", ES: "Verificar correo", PT: "Verificar e-mail", AR: "تأكيد البريد", ZH: "验证邮箱", DE: "E-Mail bestätigen", JA: "メール確認", RU: "Подтвердить email" },
  "onboarding.step.addStudent": { EN: "Add Student", HT: "Ajoute Elèv", FR: "Ajouter un élève", ES: "Agregar estudiante", PT: "Adicionar aluno", AR: "إضافة طالب", ZH: "添加学生", DE: "Schüler hinzufügen", JA: "生徒を追加", RU: "Добавить ученика" },
  "onboarding.step.configureTracks": { EN: "Set Up Subjects", HT: "Konfigire Matyè", FR: "Configurer les matières", ES: "Configurar materias", PT: "Configurar matérias", AR: "إعداد المواد", ZH: "设置科目", DE: "Fächer einrichten", JA: "科目を設定", RU: "Настроить предметы" },
  "onboarding.step.notifications": { EN: "Notifications", HT: "Notifikasyon", FR: "Notifications", ES: "Notificaciones", PT: "Notificações", AR: "الإشعارات", ZH: "通知", DE: "Benachrichtigungen", JA: "通知", RU: "Уведомления" },
  "onboarding.skipForNow": { EN: "Set up later", HT: "Konfigire pita", FR: "Configurer plus tard", ES: "Configurar después", PT: "Configurar depois", AR: "الإعداد لاحقاً", ZH: "稍后设置", DE: "Später einrichten", JA: "後で設定", RU: "Настроить позже" },
  "dashboard.notificationIncomplete": { EN: "Notifications not set up yet", HT: "Notifikasyon pa konfigire ankò", FR: "Notifications non configurées", ES: "Notificaciones no configuradas", PT: "Notificações não configuradas", AR: "الإشعارات غير مُعدّة بعد", ZH: "通知尚未设置", DE: "Benachrichtigungen noch nicht eingerichtet", JA: "通知が未設定です", RU: "Уведомления ещё не настроены" },
  "dashboard.setupNow": { EN: "Set up now", HT: "Konfigire kounye a", FR: "Configurer maintenant", ES: "Configurar ahora", PT: "Configurar agora", AR: "الإعداد الآن", ZH: "立即设置", DE: "Jetzt einrichten", JA: "今すぐ設定", RU: "Настроить сейчас" },

  // Rewards suggestions
  "rewards.suggestions.movieNight": { EN: "Movie Night", HT: "Sware Fim", FR: "Soirée cinéma", ES: "Noche de cine", PT: "Noite de filme", AR: "ليلة أفلام", ZH: "电影之夜", DE: "Filmabend", JA: "映画の夜", RU: "Вечер кино" },
  "rewards.suggestions.screenTime": { EN: "Extra Screen Time", HT: "Tan Ekran Anplis", FR: "Temps d'écran supplémentaire", ES: "Tiempo extra de pantalla", PT: "Tempo extra de tela", AR: "وقت شاشة إضافي", ZH: "额外屏幕时间", DE: "Extra Bildschirmzeit", JA: "追加スクリーンタイム", RU: "Дополнительное экранное время" },
  "rewards.suggestions.iceCream": { EN: "Ice Cream Trip", HT: "Ale Pran Krèm", FR: "Sortie glace", ES: "Salida por helado", PT: "Passeio de sorvete", AR: "رحلة آيس كريم", ZH: "冰淇淋之旅", DE: "Eisausflug", JA: "アイスクリーム", RU: "Мороженое" },
  "rewards.suggestions.stayUpLate": { EN: "Stay Up Late", HT: "Rete Leve Ta", FR: "Veiller tard", ES: "Quedarse despierto", PT: "Dormir tarde", AR: "السهر", ZH: "晚睡", DE: "Lange aufbleiben", JA: "夜更かし", RU: "Поздний отбой" },
  "rewards.suggestions.chooseDinner": { EN: "Choose Dinner", HT: "Chwazi Dine", FR: "Choisir le dîner", ES: "Elegir la cena", PT: "Escolher o jantar", AR: "اختيار العشاء", ZH: "选择晚餐", DE: "Abendessen wählen", JA: "夕食を選ぶ", RU: "Выбрать ужин" },
  "rewards.suggestions.extraGameTime": { EN: "Extra Game Time", HT: "Tan Jwèt Anplis", FR: "Temps de jeu supplémentaire", ES: "Tiempo extra de juego", PT: "Tempo extra de jogo", AR: "وقت لعب إضافي", ZH: "额外游戏时间", DE: "Extra Spielzeit", JA: "追加ゲーム時間", RU: "Дополнительное игровое время" },
  "rewards.suggestions.dayTrip": { EN: "Day Trip", HT: "Pwomnad Jounen", FR: "Excursion d'une journée", ES: "Excursión de un día", PT: "Passeio de um dia", AR: "رحلة يومية", ZH: "一日游", DE: "Tagesausflug", JA: "日帰り旅行", RU: "Однодневная поездка" },
  "rewards.suggestions.newBook": { EN: "New Book", HT: "Nouvo Liv", FR: "Nouveau livre", ES: "Nuevo libro", PT: "Novo livro", AR: "كتاب جديد", ZH: "新书", DE: "Neues Buch", JA: "新しい本", RU: "Новая книга" },
  "rewards.suggestions.sent": { EN: "Suggestion sent to parent!", HT: "Sijesyon voye bay paran!", FR: "Suggestion envoyée au parent !", ES: "¡Sugerencia enviada al padre!", PT: "Sugestão enviada ao responsável!", AR: "تم إرسال الاقتراح للوالد!", ZH: "建议已发送给家长！", DE: "Vorschlag an Eltern gesendet!", JA: "保護者に提案を送信しました！", RU: "Предложение отправлено родителю!" },
  "rewards.empty.inspirationTitle": { EN: "Reward Ideas 💡", HT: "Ide Rekonpans 💡", FR: "Idées de récompenses 💡", ES: "Ideas de recompensas 💡", PT: "Ideias de recompensas 💡", AR: "أفكار مكافآت 💡", ZH: "奖励创意 💡", DE: "Belohnungsideen 💡", JA: "報酬アイデア 💡", RU: "Идеи наград 💡" },

  // Accessibility
  "a11y.skipToContent": { EN: "Skip to main content", HT: "Ale nan kontni prensipal", FR: "Aller au contenu principal", ES: "Ir al contenido principal", PT: "Ir para o conteúdo principal", AR: "تخطي إلى المحتوى الرئيسي", ZH: "跳到主要内容", DE: "Zum Hauptinhalt springen", JA: "メインコンテンツにスキップ", RU: "Перейти к основному содержанию" },
  "a11y.statsBar": { EN: "Student statistics", HT: "Estatistik elèv", FR: "Statistiques de l'élève", ES: "Estadísticas del estudiante", PT: "Estatísticas do aluno", AR: "إحصائيات الطالب", ZH: "学生统计", DE: "Schülerstatistiken", JA: "生徒の統計", RU: "Статистика ученика" },
  "a11y.studentPhoto": { EN: "Photo of", HT: "Foto de", FR: "Photo de", ES: "Foto de", PT: "Foto de", AR: "صورة", ZH: "照片", DE: "Foto von", JA: "の写真", RU: "Фото" },
  "a11y.defaultAvatar": { EN: "Default student avatar", HT: "Avatar elèv pa defo", FR: "Avatar par défaut", ES: "Avatar predeterminado", PT: "Avatar padrão", AR: "صورة رمزية افتراضية", ZH: "默认头像", DE: "Standard-Avatar", JA: "デフォルトアバター", RU: "Аватар по умолчанию" },

  // Notification settings
  "settings.notifications.title": { EN: "Notification Settings", HT: "Paramèt Notifikasyon", FR: "Paramètres de notification", ES: "Configuración de notificaciones", PT: "Configurações de notificação", AR: "إعدادات الإشعارات", ZH: "通知设置", DE: "Benachrichtigungseinstellungen", JA: "通知設定", RU: "Настройки уведомлений" },
  "settings.whatsapp.enable": { EN: "Enable WhatsApp", HT: "Aktive WhatsApp", FR: "Activer WhatsApp", ES: "Activar WhatsApp", PT: "Ativar WhatsApp", AR: "تفعيل واتساب", ZH: "启用WhatsApp", DE: "WhatsApp aktivieren", JA: "WhatsAppを有効化", RU: "Включить WhatsApp" },
  "settings.whatsapp.number": { EN: "WhatsApp Number", HT: "Nimewo WhatsApp", FR: "Numéro WhatsApp", ES: "Número de WhatsApp", PT: "Número do WhatsApp", AR: "رقم واتساب", ZH: "WhatsApp号码", DE: "WhatsApp-Nummer", JA: "WhatsApp番号", RU: "Номер WhatsApp" },
  "settings.whatsapp.invalidFormat": { EN: "Invalid WhatsApp number format", HT: "Fòma nimewo WhatsApp envalid", FR: "Format de numéro WhatsApp invalide", ES: "Formato de número WhatsApp inválido", PT: "Formato de número WhatsApp inválido", AR: "تنسيق رقم واتساب غير صالح", ZH: "WhatsApp号码格式无效", DE: "Ungültiges WhatsApp-Nummernformat", JA: "WhatsApp番号の形式が無効です", RU: "Неверный формат номера WhatsApp" },
  "settings.channel.telegram": { EN: "Telegram", HT: "Telegram", FR: "Telegram", ES: "Telegram", PT: "Telegram", AR: "تيليجرام", ZH: "Telegram", DE: "Telegram", JA: "Telegram", RU: "Telegram" },
  "settings.channel.whatsapp": { EN: "WhatsApp", HT: "WhatsApp", FR: "WhatsApp", ES: "WhatsApp", PT: "WhatsApp", AR: "واتساب", ZH: "WhatsApp", DE: "WhatsApp", JA: "WhatsApp", RU: "WhatsApp" },
  "settings.channel.both": { EN: "Both", HT: "Tou de", FR: "Les deux", ES: "Ambos", PT: "Ambos", AR: "كلاهما", ZH: "两者", DE: "Beide", JA: "両方", RU: "Оба" },

  // AI
  "ai.rateLimitExceeded": { EN: "Hourly limit reached for Mr A", HT: "Limit èdtan rive pou Mr A", FR: "Limite horaire atteinte pour Mr A", ES: "Límite horario alcanzado para Mr A", PT: "Limite horário atingido para Mr A", AR: "تم بلوغ الحد الساعي لـ Mr A", ZH: "Mr A 每小时限制已达到", DE: "Stundenlimit für Mr A erreicht", JA: "Mr Aの時間制限に達しました", RU: "Часовой лимит Mr A достигнут" },
  "ai.rateLimitReset": { EN: "Resets at", HT: "Reyinisyalize a", FR: "Réinitialisation à", ES: "Se restablece a las", PT: "Reinicia às", AR: "يُعاد التعيين في", ZH: "重置于", DE: "Zurückgesetzt um", JA: "リセット時刻", RU: "Сброс в" },
  "ai.clearHistory": { EN: "Clear History", HT: "Efase Istwa", FR: "Effacer l'historique", ES: "Borrar historial", PT: "Limpar histórico", AR: "مسح السجل", ZH: "清除记录", DE: "Verlauf löschen", JA: "履歴を消去", RU: "Очистить историю" },
  "ai.clearHistoryConfirm": { EN: "Clear all conversation history?", HT: "Efase tout istwa konvèsasyon?", FR: "Effacer tout l'historique de conversation ?", ES: "¿Borrar todo el historial de conversación?", PT: "Limpar todo o histórico de conversa?", AR: "مسح جميع سجلات المحادثة؟", ZH: "清除所有对话记录？", DE: "Gesamten Gesprächsverlauf löschen?", JA: "すべての会話履歴を消去しますか？", RU: "Очистить всю историю разговоров?" },
  "ai.historyCleared": { EN: "History cleared", HT: "Istwa efase", FR: "Historique effacé", ES: "Historial borrado", PT: "Histórico limpo", AR: "تم مسح السجل", ZH: "记录已清除", DE: "Verlauf gelöscht", JA: "履歴が消去されました", RU: "История очищена" },
  "ai.greeting": { EN: "Hi! I'm Mr A 👋", HT: "Bonjou! Mwen se Mr A 👋", FR: "Bonjour ! Je suis Mr A 👋", ES: "¡Hola! Soy Mr A 👋", PT: "Olá! Eu sou Mr A 👋", AR: "مرحبًا! أنا Mr A 👋", ZH: "你好！我是 Mr A 👋", DE: "Hallo! Ich bin Mr A 👋", JA: "こんにちは！Mr A です 👋", RU: "Привет! Я Mr A 👋" },
  "ai.greetingDesc": { EN: "I can help with any subject. Pick a topic, upload a file, or ask me anything!", HT: "M ka ede ou ak nenpòt matyè. Chwazi yon matyè, voye yon fichye, oswa poze m yon kesyon!", FR: "Je peux vous aider dans n'importe quelle matière. Choisissez un sujet, envoyez un fichier ou posez-moi une question !", ES: "Puedo ayudarte con cualquier materia. Elige un tema, sube un archivo o pregúntame lo que quieras.", PT: "Posso ajudar com qualquer matéria. Escolha um tema, envie um arquivo ou me pergunte!", AR: "يمكنني المساعدة في أي مادة. اختر موضوعاً أو أرسل ملفاً أو اسألني أي شيء!", ZH: "我可以帮助任何科目。选择一个话题、上传文件或问我任何问题！", DE: "Ich kann bei jedem Fach helfen. Wähle ein Thema, lade eine Datei hoch oder frage mich!", JA: "どの科目でもお手伝いできます。トピックを選ぶか、ファイルを送るか、何でも聞いてください！", RU: "Я могу помочь с любым предметом. Выберите тему, загрузите файл или спросите меня!" },
  "ai.studyBuddy": { EN: "Your AI Study Buddy", HT: "Pwofesè AI ou", FR: "Votre assistant d'étude IA", ES: "Tu compañero de estudio IA", PT: "Seu parceiro de estudo IA", AR: "رفيقك الذكي في الدراسة", ZH: "你的AI学习伙伴", DE: "Dein KI-Lernpartner", JA: "あなたのAI学習パートナー", RU: "Ваш ИИ-помощник" },

  // DadPanel nav labels
  "dadpanel.coGuardians": { EN: "Co-Guardians", HT: "Ko-gadyen", FR: "Co-tuteurs", ES: "Co-tutores", PT: "Co-responsáveis", AR: "أولياء مشاركون", ZH: "共同监护人", DE: "Mit-Erziehungsberechtigte", JA: "共同保護者", RU: "Со-опекуны" },
  "dadpanel.navigation": { EN: "Navigation", HT: "Navigasyon", FR: "Navigation", ES: "Navegación", PT: "Navegação", AR: "التنقل", ZH: "导航", DE: "Navigation", JA: "ナビゲーション", RU: "Навигация" },
  "dadpanel.loginAs": { EN: "Login as", HT: "Konekte kòm", FR: "Se connecter en tant que", ES: "Iniciar sesión como", PT: "Entrar como", AR: "تسجيل الدخول كـ", ZH: "以...身份登录", DE: "Anmelden als", JA: "としてログイン", RU: "Войти как" },
  "dadpanel.notificationSettings": { EN: "Notification Settings", HT: "Paramèt Notifikasyon", FR: "Paramètres de notification", ES: "Configuración de notificaciones", PT: "Configurações de notificação", AR: "إعدادات الإشعارات", ZH: "通知设置", DE: "Benachrichtigungseinstellungen", JA: "通知設定", RU: "Настройки уведомлений" },
  "dadpanel.accountSettings": { EN: "Account Settings", HT: "Paramèt Kont", FR: "Paramètres du compte", ES: "Configuración de cuenta", PT: "Configurações da conta", AR: "إعدادات الحساب", ZH: "账户设置", DE: "Kontoeinstellungen", JA: "アカウント設定", RU: "Настройки аккаунта" },

  // Rewards panel
  "rewards.balance": { EN: "Points Balance", HT: "Balans Pwen", FR: "Solde de points", ES: "Saldo de puntos", PT: "Saldo de pontos", AR: "رصيد النقاط", ZH: "积分余额", DE: "Punktestand", JA: "ポイント残高", RU: "Баланс очков" },
  "rewards.redeemed": { EN: "Redeemed", HT: "Reklame", FR: "Échangé", ES: "Canjeado", PT: "Resgatado", AR: "مُسترد", ZH: "已兑换", DE: "Eingelöst", JA: "交換済み", RU: "Использовано" },
  "rewards.noPoints": { EN: "No points earned yet", HT: "Pa gen pwen ankò", FR: "Aucun point gagné", ES: "Aún no hay puntos", PT: "Nenhum ponto ganho", AR: "لا نقاط بعد", ZH: "还没有积分", DE: "Noch keine Punkte", JA: "まだポイントがありません", RU: "Очков пока нет" },
  "rewards.suggestToParent": { EN: "Tap a reward to suggest it to your parent!", HT: "Tape yon rekonpans pou voye sijesyon bay paran ou!", FR: "Appuyez sur une récompense pour la suggérer à votre parent !", ES: "¡Toca una recompensa para sugerirla a tu padre!", PT: "Toque em uma recompensa para sugerir ao seu responsável!", AR: "اضغط على مكافأة لاقتراحها لوالدك!", ZH: "点击奖励向家长建议！", DE: "Tippen Sie auf eine Belohnung, um sie Ihren Eltern vorzuschlagen!", JA: "報酬をタップして保護者に提案しましょう！", RU: "Нажмите на награду, чтобы предложить её родителю!" },
  "rewards.failedSuggest": { EN: "Failed to send suggestion", HT: "Echèk voye sijesyon", FR: "Échec de l'envoi de la suggestion", ES: "Error al enviar la sugerencia", PT: "Falha ao enviar sugestão", AR: "فشل إرسال الاقتراح", ZH: "发送建议失败", DE: "Vorschlag konnte nicht gesendet werden", JA: "提案の送信に失敗しました", RU: "Не удалось отправить предложение" },

  // Challenges
  "challenges.createMotivate": { EN: "Create a challenge to motivate your student!", HT: "Kreye yon defi pou motiye elèv ou!", FR: "Créez un défi pour motiver votre élève !", ES: "¡Crea un desafío para motivar a tu estudiante!", PT: "Crie um desafio para motivar seu aluno!", AR: "أنشئ تحدياً لتحفيز طالبك!", ZH: "创建挑战来激励学生！", DE: "Erstellen Sie eine Herausforderung, um Ihren Schüler zu motivieren!", JA: "生徒を応援するチャレンジを作成しましょう！", RU: "Создайте вызов, чтобы мотивировать ученика!" },
  "challenges.bonusPoints": { EN: "Bonus Points", HT: "Pwen Bonnis", FR: "Points bonus", ES: "Puntos extra", PT: "Pontos bônus", AR: "نقاط إضافية", ZH: "奖励积分", DE: "Bonuspunkte", JA: "ボーナスポイント", RU: "Бонусные очки" },
  "challenges.subjectOptional": { EN: "Subject (optional)", HT: "Matyè (opsyonèl)", FR: "Matière (optionnel)", ES: "Materia (opcional)", PT: "Matéria (opcional)", AR: "مادة (اختياري)", ZH: "科目（可选）", DE: "Fach (optional)", JA: "科目（任意）", RU: "Предмет (необязательно)" },
  "challenges.categoryOptional": { EN: "Category (optional)", HT: "Kategori (opsyonèl)", FR: "Catégorie (optionnel)", ES: "Categoría (opcional)", PT: "Categoria (opcional)", AR: "فئة (اختياري)", ZH: "类别（可选）", DE: "Kategorie (optional)", JA: "カテゴリ（任意）", RU: "Категория (необязательно)" },
  "challenges.create": { EN: "Create Challenge", HT: "Kreye Defi", FR: "Créer le défi", ES: "Crear desafío", PT: "Criar desafio", AR: "إنشاء التحدي", ZH: "创建挑战", DE: "Herausforderung erstellen", JA: "チャレンジを作成", RU: "Создать вызов" },
  "challenges.completedSection": { EN: "Completed", HT: "Fini", FR: "Terminés", ES: "Completados", PT: "Concluídos", AR: "مكتمل", ZH: "已完成", DE: "Abgeschlossen", JA: "完了", RU: "Завершённые" },

  // Feedback widget
  "feedback.title": { EN: "Share Feedback", HT: "Bay Fidbak", FR: "Donner un retour", ES: "Compartir comentarios", PT: "Dar feedback", AR: "شارك ملاحظاتك", ZH: "分享反馈", DE: "Feedback geben", JA: "フィードバックを共有", RU: "Поделиться отзывом" },
  "feedback.thanks": { EN: "Thank you! 🎉", HT: "Mèsi! 🎉", FR: "Merci ! 🎉", ES: "¡Gracias! 🎉", PT: "Obrigado! 🎉", AR: "شكراً! 🎉", ZH: "谢谢！🎉", DE: "Danke! 🎉", JA: "ありがとうございます！🎉", RU: "Спасибо! 🎉" },
  "feedback.suggest": { EN: "Suggest", HT: "Sijere", FR: "Suggérer", ES: "Sugerir", PT: "Sugerir", AR: "اقتراح", ZH: "建议", DE: "Vorschlagen", JA: "提案", RU: "Предложить" },
  "feedback.whatMakeBetter": { EN: "What would make IME better?", HT: "Kisa ki ta fè IME pi bon?", FR: "Qu'est-ce qui améliorerait IME ?", ES: "¿Qué mejoraría IME?", PT: "O que melhoraria o IME?", AR: "ما الذي يجعل IME أفضل؟", ZH: "什么能让IME更好？", DE: "Was würde IME verbessern?", JA: "IMEをより良くするには？", RU: "Что улучшило бы IME?" },
  "feedback.submitted": { EN: "Thank you for your feedback!", HT: "Mèsi pou fidbak ou!", FR: "Merci pour vos retours !", ES: "¡Gracias por tus comentarios!", PT: "Obrigado pelo seu feedback!", AR: "شكراً لملاحظاتك!", ZH: "感谢您的反馈！", DE: "Danke für Ihr Feedback!", JA: "フィードバックありがとうございます！", RU: "Спасибо за ваш отзыв!" },
  "feedback.failed": { EN: "Failed to submit feedback", HT: "Echèk soumèt fidbak", FR: "Échec de l'envoi du retour", ES: "Error al enviar comentarios", PT: "Falha ao enviar feedback", AR: "فشل إرسال الملاحظات", ZH: "提交反馈失败", DE: "Feedback konnte nicht gesendet werden", JA: "フィードバックの送信に失敗しました", RU: "Не удалось отправить отзыв" },

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
  "inbox.announcements": {
    EN: "Announcements", HT: "Anons", FR: "Annonces", ES: "Anuncios",
    PT: "Anúncios", AR: "إعلانات", ZH: "公告",
    DE: "Ankündigungen", JA: "お知らせ", RU: "Объявления",
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

  // ── Beta Mission Banner ──
  "beta.mission_banner.title": { EN: "BETA MISSION", HT: "MISYON BETA", FR: "MISSION BÊTA", ES: "MISIÓN BETA", PT: "MISSÃO BETA", AR: "مهمة بيتا", ZH: "BETA 任务", DE: "BETA-MISSION", JA: "ベータミッション", RU: "БЕТА-МИССИЯ" },
  "beta.mission_banner.subtitle": { EN: "Complete all tasks to earn Beta Champion status", HT: "Ranpli tout travay pou jwenn estati Chanpyon Beta", FR: "Complétez toutes les tâches pour devenir Champion Bêta", ES: "Completa todas las tareas para obtener el estado de Campeón Beta", PT: "Complete todas as tarefas para ganhar o status de Campeão Beta", AR: "أكمل جميع المهام للحصول على لقب بطل بيتا", ZH: "完成所有任务以获得Beta冠军称号", DE: "Erledigen Sie alle Aufgaben, um Beta-Champion zu werden", JA: "すべてのタスクを完了してベータチャンピオンになりましょう", RU: "Выполните все задания, чтобы стать Бета-чемпионом" },
  "beta.mission_banner.tasks_complete": { EN: "{{done}} of {{total}} tasks complete", HT: "{{done}} sou {{total}} travay fini", FR: "{{done}} sur {{total}} tâches terminées", ES: "{{done}} de {{total}} tareas completadas", PT: "{{done}} de {{total}} tarefas concluídas", AR: "{{done}} من {{total}} مهمة مكتملة", ZH: "已完成 {{done}}/{{total}} 个任务", DE: "{{done}} von {{total}} Aufgaben erledigt", JA: "{{done}}/{{total}} タスク完了", RU: "{{done}} из {{total}} задач выполнено" },
  "beta.mission_banner.tasks_left": { EN: "{{percent}}% — {{remaining}} tasks left", HT: "{{percent}}% — {{remaining}} travay rete", FR: "{{percent}}% — {{remaining}} tâches restantes", ES: "{{percent}}% — {{remaining}} tareas restantes", PT: "{{percent}}% — {{remaining}} tarefas restantes", AR: "{{percent}}% — {{remaining}} مهام متبقية", ZH: "{{percent}}% — 还剩 {{remaining}} 个任务", DE: "{{percent}}% — {{remaining}} Aufgaben übrig", JA: "{{percent}}% — 残り {{remaining}} タスク", RU: "{{percent}}% — осталось {{remaining}} задач" },
  "beta.mission_banner.next_up": { EN: "Next up", HT: "Pwochen", FR: "Suivant", ES: "Siguiente", PT: "Próximo", AR: "التالي", ZH: "下一个", DE: "Als nächstes", JA: "次のタスク", RU: "Далее" },
  "beta.mission_banner.earn_points": { EN: "Complete it to earn {{points}} pts.", HT: "Ranpli li pou jwenn {{points}} pwen.", FR: "Complétez-la pour gagner {{points}} pts.", ES: "Complétala para ganar {{points}} pts.", PT: "Complete para ganhar {{points}} pts.", AR: "أكملها لتحصل على {{points}} نقطة.", ZH: "完成即可获得 {{points}} 分。", DE: "Erledigen Sie sie für {{points}} Pkt.", JA: "完了すると {{points}} ポイント獲得。", RU: "Завершите для получения {{points}} очков." },
  "beta.mission_banner.start_button": { EN: "Start", HT: "Kòmanse", FR: "Commencer", ES: "Iniciar", PT: "Iniciar", AR: "ابدأ", ZH: "开始", DE: "Starten", JA: "開始", RU: "Начать" },
  "beta.mission_banner.level_explorer": { EN: "Explorer", HT: "Eksploratè", FR: "Explorateur", ES: "Explorador", PT: "Explorador", AR: "مستكشف", ZH: "探索者", DE: "Entdecker", JA: "エクスプローラー", RU: "Исследователь" },
  "beta.mission_banner.level_tester": { EN: "Tester", HT: "Testè", FR: "Testeur", ES: "Probador", PT: "Testador", AR: "مختبر", ZH: "测试员", DE: "Tester", JA: "テスター", RU: "Тестировщик" },
  "beta.mission_banner.level_contributor": { EN: "Contributor", HT: "Kontribitè", FR: "Contributeur", ES: "Contribuidor", PT: "Contribuidor", AR: "مساهم", ZH: "贡献者", DE: "Mitwirkender", JA: "コントリビューター", RU: "Участник" },
  "beta.mission_banner.level_champion": { EN: "Beta Champion", HT: "Chanpyon Beta", FR: "Champion Bêta", ES: "Campeón Beta", PT: "Campeão Beta", AR: "بطل بيتا", ZH: "Beta冠军", DE: "Beta-Champion", JA: "ベータチャンピオン", RU: "Бета-чемпион" },
  "beta.mission_banner.all_complete": { EN: "Mission Complete! You are now a Beta Champion.", HT: "Misyon Fini! Ou se yon Chanpyon Beta kounye a.", FR: "Mission accomplie ! Vous êtes désormais Champion Bêta.", ES: "¡Misión completada! Ahora eres un Campeón Beta.", PT: "Missão completa! Agora você é um Campeão Beta.", AR: "اكتملت المهمة! أنت الآن بطل بيتا.", ZH: "任务完成！您现在是Beta冠军。", DE: "Mission abgeschlossen! Sie sind jetzt Beta-Champion.", JA: "ミッション完了！ベータチャンピオンになりました。", RU: "Миссия выполнена! Вы теперь Бета-чемпион." },
  "beta.mission_banner.submit_feedback": { EN: "Submit final feedback", HT: "Soumèt kòmantè final", FR: "Soumettre le retour final", ES: "Enviar comentarios finales", PT: "Enviar feedback final", AR: "إرسال الملاحظات النهائية", ZH: "提交最终反馈", DE: "Abschließendes Feedback senden", JA: "最終フィードバックを送信", RU: "Отправить финальный отзыв" },
  
  "beta.welcome_modal.title": { EN: "Welcome! Here is your mission.", HT: "Byenveni! Men misyon ou.", FR: "Bienvenue ! Voici votre mission.", ES: "¡Bienvenido! Aquí está tu misión.", PT: "Bem-vindo! Aqui está sua missão.", AR: "مرحبًا! هذه مهمتك.", ZH: "欢迎！这是你的任务。", DE: "Willkommen! Hier ist Ihre Mission.", JA: "ようこそ！あなたのミッションです。", RU: "Добро пожаловать! Вот ваша миссия." },
  "beta.welcome_modal.subtitle": { EN: "Complete all tasks to become a Beta Champion", HT: "Fini tout travay pou w vin yon Chanpyon Beta", FR: "Complétez toutes les tâches pour devenir Champion Bêta", ES: "Completa todas las tareas para convertirte en Campeón Beta", PT: "Complete todas as tarefas para se tornar um Campeão Beta", AR: "أكمل جميع المهام لتصبح بطل بيتا", ZH: "完成所有任务成为Beta冠军", DE: "Erledigen Sie alle Aufgaben, um Beta-Champion zu werden", JA: "すべてのタスクを完了してベータチャンピオンになろう", RU: "Выполните все задания, чтобы стать Бета-чемпионом" },
  "beta.welcome_modal.start_button": { EN: "Start Task 1 →", HT: "Kòmanse Travay 1 →", FR: "Commencer la tâche 1 →", ES: "Comenzar Tarea 1 →", PT: "Iniciar Tarefa 1 →", AR: "ابدأ المهمة 1 ←", ZH: "开始任务 1 →", DE: "Aufgabe 1 starten →", JA: "タスク1を開始 →", RU: "Начать задание 1 →" },

  // ── AddStudentChoice ──
  "student.addTitle": { EN: "Add a Student", HT: "Ajoute yon Elèv", FR: "Ajouter un élève", ES: "Agregar un estudiante", PT: "Adicionar um aluno", AR: "إضافة طالب", ZH: "添加学生", DE: "Schüler hinzufügen", JA: "生徒を追加", RU: "Добавить ученика" },
  "student.chooseMethod": { EN: "Choose how you'd like to create the student profile:", HT: "Chwazi kijan ou vle kreye pwofil elèv la:", FR: "Choisissez comment créer le profil de l'élève :", ES: "Elige cómo crear el perfil del estudiante:", PT: "Escolha como criar o perfil do aluno:", AR: "اختر طريقة إنشاء ملف الطالب:", ZH: "选择如何创建学生资料：", DE: "Wählen Sie, wie Sie das Schülerprofil erstellen möchten:", JA: "生徒プロフィールの作成方法を選択：", RU: "Выберите способ создания профиля ученика:" },
  "student.fullForm": { EN: "Complete Profile Form", HT: "Fòm Konplè", FR: "Formulaire complet", ES: "Formulario completo", PT: "Formulário completo", AR: "نموذج كامل", ZH: "完整表格", DE: "Vollständiges Formular", JA: "完全プロフィールフォーム", RU: "Полная форма профиля" },
  "student.fullFormDesc": { EN: "Fill in all personal details, upload a photo, and import schedule documents.", HT: "Ranpli tout enfòmasyon pèsonèl, foto, epi telechaje dokiman orè.", FR: "Remplissez tous les détails, téléchargez une photo et importez les documents d'horaire.", ES: "Complete todos los datos personales, suba una foto e importe documentos de horario.", PT: "Preencha todos os dados pessoais, envie uma foto e importe documentos de agenda.", AR: "املأ جميع التفاصيل الشخصية، ارفع صورة، واستورد مستندات الجدول.", ZH: "填写所有个人详情、上传照片并导入课程表文件。", DE: "Füllen Sie alle persönlichen Daten aus, laden Sie ein Foto hoch und importieren Sie Stundenpläne.", JA: "すべての個人情報を入力し、写真をアップロードしてスケジュール文書をインポートします。", RU: "Заполните все данные, загрузите фото и импортируйте документы расписания." },
  "student.quickCreate": { EN: "Quick Create & Share", HT: "Kreye Rapid", FR: "Création rapide", ES: "Creación rápida", PT: "Criação rápida", AR: "إنشاء سريع", ZH: "快速创建", DE: "Schnell erstellen", JA: "クイック作成", RU: "Быстрое создание" },
  "student.quickCreateDesc": { EN: "Create a basic profile and get a shareable message via email or text. Complete details later.", HT: "Kreye yon pwofil bazik epi jwenn yon mesaj pou voye pa imèl oswa tèks. Ou ka konplete detay yo aprè.", FR: "Créez un profil basique et obtenez un message partageable par email ou SMS. Complétez les détails plus tard.", ES: "Cree un perfil básico y obtenga un mensaje para compartir por correo o texto. Complete los detalles después.", PT: "Crie um perfil básico e obtenha uma mensagem compartilhável por e-mail ou texto. Complete os detalhes depois.", AR: "أنشئ ملفًا أساسيًا واحصل على رسالة مشاركة عبر البريد أو النص. أكمل التفاصيل لاحقًا.", ZH: "创建基本资料并获取可分享的消息。稍后补充详情。", DE: "Erstellen Sie ein Basisprofil und erhalten Sie eine teilbare Nachricht. Vervollständigen Sie die Details später.", JA: "基本プロフィールを作成し、共有可能なメッセージを取得します。詳細は後で入力できます。", RU: "Создайте базовый профиль и получите сообщение для отправки. Заполните детали позже." },

  // ── AddStudentQuickCreate ──
  "student.created_title": { EN: "Student Created!", HT: "Elèv Kreye!", FR: "Élève créé !", ES: "¡Estudiante creado!", PT: "Aluno criado!", AR: "تم إنشاء الطالب!", ZH: "学生已创建！", DE: "Schüler erstellt!", JA: "生徒が作成されました！", RU: "Ученик создан!" },
  "student.nameRequired": { EN: "Name and Student ID are required", HT: "Non ak ID elèv obligatwa", FR: "Le nom et l'identifiant sont requis", ES: "El nombre y la identificación son obligatorios", PT: "Nome e ID do aluno são obrigatórios", AR: "الاسم ومعرف الطالب مطلوبان", ZH: "姓名和学生ID为必填项", DE: "Name und Schüler-ID sind erforderlich", JA: "名前と生徒IDは必須です", RU: "Имя и ID ученика обязательны" },
  "student.autoGenerated": { EN: "Auto-generated from name", HT: "Otomatikman jenere", FR: "Généré automatiquement", ES: "Generado automáticamente", PT: "Gerado automaticamente", AR: "تم إنشاؤه تلقائيًا", ZH: "根据姓名自动生成", DE: "Automatisch generiert", JA: "名前から自動生成", RU: "Сгенерировано автоматически" },
  "student.createBtn": { EN: "Create Student", HT: "Kreye Elèv", FR: "Créer l'élève", ES: "Crear estudiante", PT: "Criar aluno", AR: "إنشاء طالب", ZH: "创建学生", DE: "Schüler erstellen", JA: "生徒を作成", RU: "Создать ученика" },
  "student.basicCreatedDesc": { EN: "Basic profile created. Share this message via email or text:", HT: "Pwofil bazik la kreye. Voye mesaj sa a pa imèl oswa tèks pou pataje enfòmasyon yo:", FR: "Profil de base créé. Partagez ce message par email ou SMS :", ES: "Perfil básico creado. Comparta este mensaje por correo o texto:", PT: "Perfil básico criado. Compartilhe esta mensagem por e-mail ou texto:", AR: "تم إنشاء الملف الأساسي. شارك هذه الرسالة عبر البريد أو النص:", ZH: "基本资料已创建。通过邮件或短信分享此消息：", DE: "Basisprofil erstellt. Teilen Sie diese Nachricht per E-Mail oder SMS:", JA: "基本プロフィールが作成されました。メールまたはテキストで共有：", RU: "Базовый профиль создан. Поделитесь этим сообщением по email или SMS:" },
  "student.quickCreateBasicDesc": { EN: "Create a basic profile. You can add photo, schedule, and other details later.", HT: "Kreye yon pwofil bazik. Ou ka ajoute foto, orè, ak lòt detay aprè.", FR: "Créez un profil de base. Vous pouvez ajouter photo, horaire et autres détails plus tard.", ES: "Cree un perfil básico. Puede agregar foto, horario y otros detalles más tarde.", PT: "Crie um perfil básico. Você pode adicionar foto, agenda e outros detalhes depois.", AR: "أنشئ ملفًا أساسيًا. يمكنك إضافة الصورة والجدول والتفاصيل لاحقًا.", ZH: "创建基本资料。您可以稍后添加照片、课程表和其他详情。", DE: "Erstellen Sie ein Basisprofil. Foto, Stundenplan und Details können später hinzugefügt werden.", JA: "基本プロフィールを作成します。写真やスケジュールなどは後で追加できます。", RU: "Создайте базовый профиль. Фото, расписание и другие данные можно добавить позже." },
  "student.completeFromStudentsTab": { EN: "You can complete the profile with photo, schedule, and more from the Students tab.", HT: "Ou ka ajoute foto, orè, ak lòt detay nan tab Elèv la.", FR: "Vous pouvez compléter le profil depuis l'onglet Élèves.", ES: "Puede completar el perfil desde la pestaña Estudiantes.", PT: "Você pode completar o perfil na aba Alunos.", AR: "يمكنك إكمال الملف من تبويب الطلاب.", ZH: "您可以在学生标签页中完善资料。", DE: "Sie können das Profil über den Tab Schüler vervollständigen.", JA: "生徒タブからプロフィールを完成できます。", RU: "Вы можете дополнить профиль во вкладке Ученики." },
  "action.copy": { EN: "Copy", HT: "Kopye", FR: "Copier", ES: "Copiar", PT: "Copiar", AR: "نسخ", ZH: "复制", DE: "Kopieren", JA: "コピー", RU: "Копировать" },
  "action.copied": { EN: "Copied!", HT: "Kopye!", FR: "Copié !", ES: "¡Copiado!", PT: "Copiado!", AR: "تم النسخ!", ZH: "已复制！", DE: "Kopiert!", JA: "コピーしました！", RU: "Скопировано!" },
  "action.done": { EN: "Done", HT: "Fini", FR: "Terminé", ES: "Listo", PT: "Concluído", AR: "تم", ZH: "完成", DE: "Fertig", JA: "完了", RU: "Готово" },
  "action.continue": { EN: "Continue", HT: "Kontinye", FR: "Continuer", ES: "Continuar", PT: "Continuar", AR: "متابعة", ZH: "继续", DE: "Weiter", JA: "続行", RU: "Продолжить" },
  "action.back": { EN: "Back", HT: "Retounen", FR: "Retour", ES: "Volver", PT: "Voltar", AR: "رجوع", ZH: "返回", DE: "Zurück", JA: "戻る", RU: "Назад" },
  "action.verify": { EN: "Verify", HT: "Verifye", FR: "Vérifier", ES: "Verificar", PT: "Verificar", AR: "تحقق", ZH: "验证", DE: "Überprüfen", JA: "確認", RU: "Проверить" },
  "action.saved": { EN: "Saved!", HT: "Anrejistre!", FR: "Enregistré !", ES: "¡Guardado!", PT: "Salvo!", AR: "تم الحفظ!", ZH: "已保存！", DE: "Gespeichert!", JA: "保存しました！", RU: "Сохранено!" },

  // ── MFA ──
  "mfa.confirmPassword": { EN: "Confirm your password", HT: "Konfime modpas ou", FR: "Confirmez votre mot de passe", ES: "Confirme su contraseña", PT: "Confirme sua senha", AR: "أكد كلمة المرور", ZH: "确认密码", DE: "Passwort bestätigen", JA: "パスワードを確認", RU: "Подтвердите пароль" },
  "mfa.confirmPasswordDesc": { EN: "Enter your password to disable MFA", HT: "Antre modpas ou pou dezaktive MFA", FR: "Entrez votre mot de passe pour désactiver l'AMF", ES: "Ingrese su contraseña para desactivar MFA", PT: "Digite sua senha para desativar MFA", AR: "أدخل كلمة المرور لتعطيل MFA", ZH: "输入密码以禁用MFA", DE: "Geben Sie Ihr Passwort ein, um MFA zu deaktivieren", JA: "MFAを無効にするためにパスワードを入力", RU: "Введите пароль для отключения MFA" },
  "mfa.incorrectPassword": { EN: "Incorrect password", HT: "Modpas pa kòrèk", FR: "Mot de passe incorrect", ES: "Contraseña incorrecta", PT: "Senha incorreta", AR: "كلمة المرور غير صحيحة", ZH: "密码不正确", DE: "Falsches Passwort", JA: "パスワードが正しくありません", RU: "Неверный пароль" },
  "mfa.mfaEnabled": { EN: "MFA enabled!", HT: "MFA aktive!", FR: "AMF activée !", ES: "¡MFA activado!", PT: "MFA ativado!", AR: "تم تفعيل MFA!", ZH: "MFA已启用！", DE: "MFA aktiviert!", JA: "MFA有効化！", RU: "MFA включена!" },
  "mfa.mfaDisabled": { EN: "MFA disabled", HT: "MFA dezaktive", FR: "AMF désactivée", ES: "MFA desactivado", PT: "MFA desativado", AR: "تم تعطيل MFA", ZH: "MFA已禁用", DE: "MFA deaktiviert", JA: "MFA無効化", RU: "MFA отключена" },
  "auth.password": { EN: "Password", HT: "Modpas", FR: "Mot de passe", ES: "Contraseña", PT: "Senha", AR: "كلمة المرور", ZH: "密码", DE: "Passwort", JA: "パスワード", RU: "Пароль" },

  // ── Rewards ──
  "rewards.pointsBalance": { EN: "Points Balance", HT: "Balans Pwen", FR: "Solde de points", ES: "Saldo de puntos", PT: "Saldo de pontos", AR: "رصيد النقاط", ZH: "积分余额", DE: "Punktestand", JA: "ポイント残高", RU: "Баланс очков" },
  "rewards.block": { EN: "Block", HT: "Blòk", FR: "Bloc", ES: "Bloque", PT: "Bloco", AR: "كتلة", ZH: "区块", DE: "Block", JA: "ブロック", RU: "Блок" },
  "rewards.checkin": { EN: "Check-in", HT: "Tcheke", FR: "Pointage", ES: "Registro", PT: "Check-in", AR: "تسجيل", ZH: "签到", DE: "Check-In", JA: "チェックイン", RU: "Отметка" },
  "rewards.perfectDay": { EN: "Perfect Day", HT: "Jou pafè", FR: "Journée parfaite", ES: "Día perfecto", PT: "Dia perfeito", AR: "يوم مثالي", ZH: "完美一天", DE: "Perfekter Tag", JA: "パーフェクトデー", RU: "Идеальный день" },
  "rewards.wallet": { EN: "Wallet", HT: "Pòtfèy", FR: "Portefeuille", ES: "Billetera", PT: "Carteira", AR: "محفظة", ZH: "钱包", DE: "Geldbörse", JA: "ウォレット", RU: "Кошелёк" },
  "rewards.shop": { EN: "Shop", HT: "Boutik", FR: "Boutique", ES: "Tienda", PT: "Loja", AR: "متجر", ZH: "商店", DE: "Shop", JA: "ショップ", RU: "Магазин" },
  "rewards.history": { EN: "History", HT: "Istwa", FR: "Historique", ES: "Historial", PT: "Histórico", AR: "السجل", ZH: "历史", DE: "Verlauf", JA: "履歴", RU: "История" },
  "rewards.redeemedTab": { EN: "Redeemed", HT: "Reklame", FR: "Échangé", ES: "Canjeado", PT: "Resgatado", AR: "مُسترد", ZH: "已兑换", DE: "Eingelöst", JA: "使用済み", RU: "Использовано" },
  "rewards.notEnough": { EN: "Not enough points!", HT: "Pa gen ase pwen!", FR: "Pas assez de points !", ES: "¡Puntos insuficientes!", PT: "Pontos insuficientes!", AR: "نقاط غير كافية!", ZH: "积分不足！", DE: "Nicht genug Punkte!", JA: "ポイント不足！", RU: "Недостаточно очков!" },
  "rewards.redeemed_toast": { EN: "redeemed!", HT: "reklame!", FR: "échangé !", ES: "¡canjeado!", PT: "resgatado!", AR: "مُسترد!", ZH: "已兑换！", DE: "eingelöst!", JA: "使用済み！", RU: "использовано!" },
  "rewards.tapToSuggest": { EN: "Tap a reward to suggest it to your parent!", HT: "Tape yon rekonpans pou voye sijesyon bay paran ou!", FR: "Appuyez pour suggérer une récompense à votre parent !", ES: "¡Toca una recompensa para sugerirla a tu padre!", PT: "Toque em uma recompensa para sugerir ao seu responsável!", AR: "اضغط على مكافأة لاقتراحها لولي أمرك!", ZH: "点击奖励推荐给家长！", DE: "Tippen Sie, um eine Belohnung vorzuschlagen!", JA: "タップして保護者に提案しましょう！", RU: "Нажмите, чтобы предложить награду родителю!" },
  "rewards.redeem": { EN: "Redeem", HT: "Reklame", FR: "Échanger", ES: "Canjear", PT: "Resgatar", AR: "استرداد", ZH: "兑换", DE: "Einlösen", JA: "交換", RU: "Обменять" },
  "rewards.needMore": { EN: "Need more", HT: "Bezwen plis", FR: "Besoin de plus", ES: "Necesita más", PT: "Precisa mais", AR: "تحتاج المزيد", ZH: "需要更多", DE: "Mehr benötigt", JA: "もっと必要", RU: "Нужно больше" },
  "rewards.sent": { EN: "Sent", HT: "Voye", FR: "Envoyé", ES: "Enviado", PT: "Enviado", AR: "مُرسل", ZH: "已发送", DE: "Gesendet", JA: "送信済み", RU: "Отправлено" },
  "rewards.suggest": { EN: "Suggest", HT: "Sijere", FR: "Suggérer", ES: "Sugerir", PT: "Sugerir", AR: "اقتراح", ZH: "推荐", DE: "Vorschlagen", JA: "提案", RU: "Предложить" },
  "rewards.noPointsYet": { EN: "No points earned yet", HT: "Pa gen pwen ankò", FR: "Aucun point gagné", ES: "Sin puntos aún", PT: "Nenhum ponto ganho", AR: "لم يتم كسب نقاط بعد", ZH: "尚未获得积分", DE: "Noch keine Punkte", JA: "まだポイントがありません", RU: "Очков пока нет" },
  "rewards.noRedemptions": { EN: "No redemptions yet", HT: "Pa gen reklame ankò", FR: "Aucun échange", ES: "Sin canjes aún", PT: "Nenhum resgate", AR: "لا توجد عمليات استرداد", ZH: "尚无兑换记录", DE: "Noch keine Einlösungen", JA: "まだ交換がありません", RU: "Обменов пока нет" },
  "rewards.suggestFailed": { EN: "Failed to send suggestion", HT: "Echèk voye sijesyon", FR: "Échec de l'envoi", ES: "Error al enviar", PT: "Falha ao enviar", AR: "فشل في الإرسال", ZH: "发送失败", DE: "Senden fehlgeschlagen", JA: "送信に失敗", RU: "Ошибка отправки" },
  "rewards.studentBalance": { EN: "Student Balance", HT: "Balans Elèv", FR: "Solde élève", ES: "Saldo del estudiante", PT: "Saldo do aluno", AR: "رصيد الطالب", ZH: "学生余额", DE: "Schülerguthaben", JA: "生徒残高", RU: "Баланс ученика" },
  "rewards.bonus": { EN: "Bonus", HT: "Bonnis", FR: "Bonus", ES: "Bonus", PT: "Bônus", AR: "مكافأة", ZH: "奖金", DE: "Bonus", JA: "ボーナス", RU: "Бонус" },
  "rewards.pendingRedemptions": { EN: "Pending Redemptions", HT: "Reklame an atant", FR: "Échanges en attente", ES: "Canjes pendientes", PT: "Resgates pendentes", AR: "عمليات استرداد معلقة", ZH: "待兑换", DE: "Ausstehende Einlösungen", JA: "保留中の交換", RU: "Ожидающие обмены" },
  "rewards.fulfill": { EN: "Fulfill", HT: "Bay", FR: "Distribuer", ES: "Entregar", PT: "Entregar", AR: "تنفيذ", ZH: "发放", DE: "Ausgeben", JA: "付与", RU: "Выдать" },
  "rewards.catalog": { EN: "Rewards Catalog", HT: "Katalòg Rekonpans", FR: "Catalogue de récompenses", ES: "Catálogo de recompensas", PT: "Catálogo de recompensas", AR: "كتالوج المكافآت", ZH: "奖励目录", DE: "Belohnungskatalog", JA: "報酬カタログ", RU: "Каталог наград" },
  "rewards.addFirst": { EN: "Add your first reward!", HT: "Ajoute premye rekonpans ou!", FR: "Ajoutez votre première récompense !", ES: "¡Agregue su primera recompensa!", PT: "Adicione sua primeira recompensa!", AR: "أضف أول مكافأة!", ZH: "添加您的第一个奖励！", DE: "Fügen Sie Ihre erste Belohnung hinzu!", JA: "最初の報酬を追加！", RU: "Добавьте первую награду!" },
  "rewards.studentCanRedeem": { EN: "Students can redeem points for rewards", HT: "Elèv yo ka reklame pwen pou rekonpans", FR: "Les élèves peuvent échanger des points", ES: "Los estudiantes pueden canjear puntos", PT: "Alunos podem resgatar pontos", AR: "يمكن للطلاب استبدال النقاط", ZH: "学生可以用积分兑换奖励", DE: "Schüler können Punkte einlösen", JA: "生徒はポイントを報酬と交換できます", RU: "Ученики могут обменять очки на награды" },
  "rewards.newReward": { EN: "New Reward", HT: "Nouvo Rekonpans", FR: "Nouvelle récompense", ES: "Nueva recompensa", PT: "Nova recompensa", AR: "مكافأة جديدة", ZH: "新奖励", DE: "Neue Belohnung", JA: "新しい報酬", RU: "Новая награда" },
  "rewards.editReward": { EN: "Edit Reward", HT: "Modifye Rekonpans", FR: "Modifier la récompense", ES: "Editar recompensa", PT: "Editar recompensa", AR: "تعديل المكافأة", ZH: "编辑奖励", DE: "Belohnung bearbeiten", JA: "報酬を編集", RU: "Редактировать награду" },
  "rewards.rewardUpdated": { EN: "Reward updated!", HT: "Rekonpans mete ajou!", FR: "Récompense mise à jour !", ES: "¡Recompensa actualizada!", PT: "Recompensa atualizada!", AR: "تم تحديث المكافأة!", ZH: "奖励已更新！", DE: "Belohnung aktualisiert!", JA: "報酬を更新しました！", RU: "Награда обновлена!" },
  "rewards.rewardAdded": { EN: "Reward added!", HT: "Rekonpans ajoute!", FR: "Récompense ajoutée !", ES: "¡Recompensa agregada!", PT: "Recompensa adicionada!", AR: "تمت إضافة المكافأة!", ZH: "奖励已添加！", DE: "Belohnung hinzugefügt!", JA: "報酬を追加しました！", RU: "Награда добавлена!" },
  "rewards.rewardFulfilled": { EN: "Reward fulfilled!", HT: "Rekonpans bay!", FR: "Récompense distribuée !", ES: "¡Recompensa entregada!", PT: "Recompensa entregue!", AR: "تم تنفيذ المكافأة!", ZH: "奖励已发放！", DE: "Belohnung ausgegeben!", JA: "報酬が付与されました！", RU: "Награда выдана!" },
  "rewards.icon": { EN: "Icon", HT: "Ikòn", FR: "Icône", ES: "Icono", PT: "Ícone", AR: "أيقونة", ZH: "图标", DE: "Symbol", JA: "アイコン", RU: "Иконка" },
  "rewards.cost": { EN: "Cost (Points)", HT: "Pri (Pwen)", FR: "Coût (Points)", ES: "Costo (Puntos)", PT: "Custo (Pontos)", AR: "التكلفة (نقاط)", ZH: "费用（积分）", DE: "Kosten (Punkte)", JA: "コスト（ポイント）", RU: "Стоимость (очки)" },
  "rewards.enabled": { EN: "Enabled", HT: "Aktif", FR: "Activé", ES: "Activado", PT: "Ativado", AR: "مفعّل", ZH: "已启用", DE: "Aktiviert", JA: "有効", RU: "Включено" },
  "rewards.update": { EN: "Update", HT: "Mete Ajou", FR: "Mettre à jour", ES: "Actualizar", PT: "Atualizar", AR: "تحديث", ZH: "更新", DE: "Aktualisieren", JA: "更新", RU: "Обновить" },
  "rewards.addReward": { EN: "Add Reward", HT: "Ajoute", FR: "Ajouter", ES: "Agregar", PT: "Adicionar", AR: "إضافة", ZH: "添加奖励", DE: "Belohnung hinzufügen", JA: "報酬を追加", RU: "Добавить награду" },
  "rewards.awardBonusPoints": { EN: "Award Bonus Points", HT: "Bay Pwen Bonnis", FR: "Attribuer des points bonus", ES: "Otorgar puntos extra", PT: "Conceder pontos bônus", AR: "منح نقاط إضافية", ZH: "奖励积分", DE: "Bonuspunkte vergeben", JA: "ボーナスポイントを付与", RU: "Начислить бонусные очки" },
  "rewards.points": { EN: "Points", HT: "Pwen", FR: "Points", ES: "Puntos", PT: "Pontos", AR: "نقاط", ZH: "积分", DE: "Punkte", JA: "ポイント", RU: "Очки" },
  "rewards.reason": { EN: "Reason", HT: "Rezon", FR: "Raison", ES: "Razón", PT: "Motivo", AR: "السبب", ZH: "原因", DE: "Grund", JA: "理由", RU: "Причина" },
  "rewards.awardPoints": { EN: "Award Points", HT: "Bay Pwen", FR: "Attribuer les points", ES: "Otorgar puntos", PT: "Conceder pontos", AR: "منح النقاط", ZH: "发放积分", DE: "Punkte vergeben", JA: "ポイントを付与", RU: "Начислить очки" },

  // ── Challenges ──
  "challenges.title": { EN: "Challenges", HT: "Defi", FR: "Défis", ES: "Desafíos", PT: "Desafios", AR: "تحديات", ZH: "挑战", DE: "Herausforderungen", JA: "チャレンジ", RU: "Задания" },
  "challenges.new": { EN: "New", HT: "Nouvo", FR: "Nouveau", ES: "Nuevo", PT: "Novo", AR: "جديد", ZH: "新", DE: "Neu", JA: "新規", RU: "Новое" },
  "challenges.noActive": { EN: "No active challenges", HT: "Pa gen defi aktif", FR: "Aucun défi actif", ES: "Sin desafíos activos", PT: "Nenhum desafio ativo", AR: "لا توجد تحديات نشطة", ZH: "没有活跃的挑战", DE: "Keine aktiven Herausforderungen", JA: "アクティブなチャレンジなし", RU: "Нет активных заданий" },
  "challenges.motivate": { EN: "Create a challenge to motivate your student!", HT: "Kreye yon defi pou motiye elèv ou!", FR: "Créez un défi pour motiver votre élève !", ES: "¡Cree un desafío para motivar a su estudiante!", PT: "Crie um desafio para motivar seu aluno!", AR: "أنشئ تحديًا لتحفيز طالبك!", ZH: "创建一个挑战来激励你的学生！", DE: "Erstellen Sie eine Herausforderung, um Ihren Schüler zu motivieren!", JA: "生徒を動機付けるチャレンジを作成しましょう！", RU: "Создайте задание, чтобы мотивировать ученика!" },
  "challenges.created": { EN: "Challenge created!", HT: "Defi kreye!", FR: "Défi créé !", ES: "¡Desafío creado!", PT: "Desafio criado!", AR: "تم إنشاء التحدي!", ZH: "挑战已创建！", DE: "Herausforderung erstellt!", JA: "チャレンジ作成！", RU: "Задание создано!" },
  "challenges.pts": { EN: "pts", HT: "pwen", FR: "pts", ES: "pts", PT: "pts", AR: "نقاط", ZH: "分", DE: "Pkt", JA: "pt", RU: "очк" },
  "challenges.completed": { EN: "Completed", HT: "Fini", FR: "Terminé", ES: "Completado", PT: "Concluído", AR: "مكتمل", ZH: "已完成", DE: "Abgeschlossen", JA: "完了", RU: "Завершено" },
  "challenges.newChallenge": { EN: "New Challenge", HT: "Nouvo Defi", FR: "Nouveau défi", ES: "Nuevo desafío", PT: "Novo desafio", AR: "تحدٍ جديد", ZH: "新挑战", DE: "Neue Herausforderung", JA: "新しいチャレンジ", RU: "Новое задание" },
  "challenges.titleLabel": { EN: "Title", HT: "Tit", FR: "Titre", ES: "Título", PT: "Título", AR: "العنوان", ZH: "标题", DE: "Titel", JA: "タイトル", RU: "Название" },
  "challenges.target": { EN: "Target", HT: "Objektif", FR: "Objectif", ES: "Objetivo", PT: "Meta", AR: "الهدف", ZH: "目标", DE: "Ziel", JA: "目標", RU: "Цель" },
  "challenges.subject": { EN: "Subject (optional)", HT: "Matyè (opsyonèl)", FR: "Matière (optionnel)", ES: "Materia (opcional)", PT: "Matéria (opcional)", AR: "المادة (اختياري)", ZH: "科目（可选）", DE: "Fach (optional)", JA: "科目（任意）", RU: "Предмет (необязательно)" },
  "challenges.category": { EN: "Category (optional)", HT: "Kategori (opsyonèl)", FR: "Catégorie (optionnel)", ES: "Categoría (opcional)", PT: "Categoria (opcional)", AR: "الفئة (اختياري)", ZH: "类别（可选）", DE: "Kategorie (optional)", JA: "カテゴリ（任意）", RU: "Категория (необязательно)" },
  "challenges.createBtn": { EN: "Create Challenge", HT: "Kreye Defi", FR: "Créer le défi", ES: "Crear desafío", PT: "Criar desafio", AR: "إنشاء التحدي", ZH: "创建挑战", DE: "Herausforderung erstellen", JA: "チャレンジを作成", RU: "Создать задание" },

  // ── Activity Feed ──
  "activity.todayFeed": { EN: "Today's Activity Feed", HT: "Aktivite Jodi a", FR: "Activité du jour", ES: "Actividad de hoy", PT: "Atividade de hoje", AR: "نشاط اليوم", ZH: "今日活动", DE: "Heutige Aktivitäten", JA: "今日のアクティビティ", RU: "Активность за сегодня" },
  "activity.started": { EN: "Started", HT: "Kòmanse", FR: "Commencé", ES: "Iniciado", PT: "Iniciado", AR: "بدأ", ZH: "已开始", DE: "Gestartet", JA: "開始", RU: "Начато" },
  "activity.completed": { EN: "Completed", HT: "Fini", FR: "Terminé", ES: "Completado", PT: "Concluído", AR: "مكتمل", ZH: "已完成", DE: "Abgeschlossen", JA: "完了", RU: "Завершено" },
  "activity.removed": { EN: "Activity entry removed", HT: "Antre retire", FR: "Entrée supprimée", ES: "Entrada eliminada", PT: "Entrada removida", AR: "تم إزالة الإدخال", ZH: "活动条目已删除", DE: "Eintrag entfernt", JA: "エントリを削除しました", RU: "Запись удалена" },
  "activity.overridden": { EN: "Activity overridden", HT: "Aktivite korije", FR: "Activité corrigée", ES: "Actividad corregida", PT: "Atividade corrigida", AR: "تم تعديل النشاط", ZH: "活动已覆盖", DE: "Aktivität überschrieben", JA: "アクティビティを上書き", RU: "Активность переопределена" },
  "activity.removeConfirm": { EN: "Remove this activity entry?", HT: "Retire antre aktivite sa a?", FR: "Supprimer cette entrée ?", ES: "¿Eliminar esta entrada?", PT: "Remover esta entrada?", AR: "إزالة هذا الإدخال؟", ZH: "删除此活动条目？", DE: "Diesen Eintrag entfernen?", JA: "このエントリを削除しますか？", RU: "Удалить эту запись?" },
  "activity.overrideTitle": { EN: "Override Activity", HT: "Korije Aktivite", FR: "Corriger l'activité", ES: "Corregir actividad", PT: "Corrigir atividade", AR: "تعديل النشاط", ZH: "覆盖活动", DE: "Aktivität überschreiben", JA: "アクティビティを上書き", RU: "Переопределить активность" },
  "activity.noToday": { EN: "No activities logged today", HT: "Pa gen aktivite jodi a", FR: "Aucune activité aujourd'hui", ES: "Sin actividades hoy", PT: "Nenhuma atividade hoje", AR: "لا توجد أنشطة اليوم", ZH: "今天没有活动记录", DE: "Heute keine Aktivitäten", JA: "今日のアクティビティなし", RU: "Нет активностей за сегодня" },
  "activity.saving": { EN: "Saving...", HT: "Ap anrejistre...", FR: "Enregistrement...", ES: "Guardando...", PT: "Salvando...", AR: "جارٍ الحفظ...", ZH: "保存中...", DE: "Speichern...", JA: "保存中...", RU: "Сохранение..." },
  "activity.saveOverride": { EN: "Save Override", HT: "Anrejistre", FR: "Enregistrer", ES: "Guardar", PT: "Salvar", AR: "حفظ", ZH: "保存覆盖", DE: "Speichern", JA: "上書き保存", RU: "Сохранить" },
  "activity.optional": { EN: "optional", HT: "opsyonèl", FR: "optionnel", ES: "opcional", PT: "opcional", AR: "اختياري", ZH: "可选", DE: "optional", JA: "任意", RU: "необязательно" },
  "activity.inProgress": { EN: "In Progress", HT: "Ap fè", FR: "En cours", ES: "En progreso", PT: "Em andamento", AR: "جارٍ", ZH: "进行中", DE: "In Arbeit", JA: "進行中", RU: "В процессе" },

  // ── Feedback Widget ──
  "feedback.shareFeedback": { EN: "Share Feedback", HT: "Pataje Kòmantè", FR: "Partager un retour", ES: "Compartir comentarios", PT: "Compartilhar feedback", AR: "شارك ملاحظاتك", ZH: "分享反馈", DE: "Feedback teilen", JA: "フィードバックを共有", RU: "Поделиться отзывом" },
  "feedback.thankyou": { EN: "Thank you! 🎉", HT: "Mèsi! 🎉", FR: "Merci ! 🎉", ES: "¡Gracias! 🎉", PT: "Obrigado! 🎉", AR: "شكراً! 🎉", ZH: "谢谢！🎉", DE: "Danke! 🎉", JA: "ありがとう！🎉", RU: "Спасибо! 🎉" },
  "feedback.rate": { EN: "Rate", HT: "Evalye", FR: "Évaluer", ES: "Calificar", PT: "Avaliar", AR: "تقييم", ZH: "评分", DE: "Bewerten", JA: "評価", RU: "Оценить" },
  "feedback.problem": { EN: "Problem", HT: "Pwoblèm", FR: "Problème", ES: "Problema", PT: "Problema", AR: "مشكلة", ZH: "问题", DE: "Problem", JA: "問題", RU: "Проблема" },
  "feedback.suggestTab": { EN: "Suggest", HT: "Sijere", FR: "Suggérer", ES: "Sugerir", PT: "Sugerir", AR: "اقتراح", ZH: "建议", DE: "Vorschlagen", JA: "提案", RU: "Предложить" },
  "feedback.howIsExperience": { EN: "How is your experience today?", HT: "Kijan eksperyans ou jodi a?", FR: "Comment est votre expérience aujourd'hui ?", ES: "¿Cómo es su experiencia hoy?", PT: "Como está sua experiência hoje?", AR: "كيف تجربتك اليوم؟", ZH: "你今天的体验如何？", DE: "Wie ist Ihre Erfahrung heute?", JA: "今日の体験はいかがですか？", RU: "Как ваш опыт сегодня?" },
  "feedback.anyComments": { EN: "Any comments? (optional)", HT: "Kòmantè? (opsyonèl)", FR: "Des commentaires ? (optionnel)", ES: "¿Algún comentario? (opcional)", PT: "Comentários? (opcional)", AR: "أي تعليقات؟ (اختياري)", ZH: "有什么意见？（可选）", DE: "Kommentare? (optional)", JA: "コメント（任意）", RU: "Комментарии? (необязательно)" },
  "feedback.submit": { EN: "Submit", HT: "Soumèt", FR: "Soumettre", ES: "Enviar", PT: "Enviar", AR: "إرسال", ZH: "提交", DE: "Absenden", JA: "送信", RU: "Отправить" },
  "feedback.sending": { EN: "Sending...", HT: "Ap voye...", FR: "Envoi...", ES: "Enviando...", PT: "Enviando...", AR: "جارٍ الإرسال...", ZH: "发送中...", DE: "Wird gesendet...", JA: "送信中...", RU: "Отправка..." },
  "feedback.whatWentWrong": { EN: "What went wrong?", HT: "Kisa ki mal pase?", FR: "Qu'est-ce qui n'a pas fonctionné ?", ES: "¿Qué salió mal?", PT: "O que deu errado?", AR: "ماذا حدث خطأ؟", ZH: "出了什么问题？", DE: "Was ging schief?", JA: "何が問題でしたか？", RU: "Что пошло не так?" },
  "feedback.describeIssue": { EN: "Describe the issue...", HT: "Dekri pwoblèm nan...", FR: "Décrivez le problème...", ES: "Describa el problema...", PT: "Descreva o problema...", AR: "صف المشكلة...", ZH: "描述问题...", DE: "Beschreiben Sie das Problem...", JA: "問題を説明...", RU: "Опишите проблему..." },
  "feedback.screenshotOptional": { EN: "Screenshot (optional)", HT: "Ekran (opsyonèl)", FR: "Capture d'écran (optionnel)", ES: "Captura (opcional)", PT: "Captura de tela (opcional)", AR: "لقطة شاشة (اختياري)", ZH: "截图（可选）", DE: "Screenshot (optional)", JA: "スクリーンショット（任意）", RU: "Скриншот (необязательно)" },
  "feedback.reportProblem": { EN: "Report Problem", HT: "Rapòte Pwoblèm", FR: "Signaler un problème", ES: "Reportar problema", PT: "Relatar problema", AR: "الإبلاغ عن مشكلة", ZH: "报告问题", DE: "Problem melden", JA: "問題を報告", RU: "Сообщить о проблеме" },
  "feedback.whatWouldMakeBetter": { EN: "What would make IME better?", HT: "Kisa ki ta fè IME pi bon?", FR: "Qu'est-ce qui améliorerait IME ?", ES: "¿Qué mejoraría IME?", PT: "O que melhoraria o IME?", AR: "ما الذي سيحسّن IME؟", ZH: "什么能让IME更好？", DE: "Was würde IME verbessern?", JA: "IMEをより良くするには？", RU: "Что улучшит IME?" },
  "feedback.yourSuggestion": { EN: "Your suggestion...", HT: "Sijesyon ou...", FR: "Votre suggestion...", ES: "Su sugerencia...", PT: "Sua sugestão...", AR: "اقتراحك...", ZH: "您的建议...", DE: "Ihr Vorschlag...", JA: "ご提案...", RU: "Ваше предложение..." },
  "feedback.sendSuggestion": { EN: "Send Suggestion", HT: "Voye Sijesyon", FR: "Envoyer la suggestion", ES: "Enviar sugerencia", PT: "Enviar sugestão", AR: "إرسال الاقتراح", ZH: "发送建议", DE: "Vorschlag senden", JA: "提案を送信", RU: "Отправить предложение" },
  "feedback.thanksToast": { EN: "Thank you for your feedback!", HT: "Mèsi pou kòmantè ou!", FR: "Merci pour votre retour !", ES: "¡Gracias por sus comentarios!", PT: "Obrigado pelo feedback!", AR: "شكراً لملاحظاتك!", ZH: "感谢您的反馈！", DE: "Danke für Ihr Feedback!", JA: "フィードバックありがとう！", RU: "Спасибо за отзыв!" },
  "feedback.failedSubmit": { EN: "Failed to submit feedback", HT: "Echèk soumèt kòmantè", FR: "Échec de l'envoi du retour", ES: "Error al enviar comentarios", PT: "Falha ao enviar feedback", AR: "فشل في إرسال الملاحظات", ZH: "提交反馈失败", DE: "Feedback konnte nicht gesendet werden", JA: "フィードバック送信失敗", RU: "Ошибка отправки отзыва" },
  "feedback.giveFeedback": { EN: "Give feedback", HT: "Bay kòmantè", FR: "Donner un retour", ES: "Dar comentarios", PT: "Dar feedback", AR: "تقديم ملاحظات", ZH: "提供反馈", DE: "Feedback geben", JA: "フィードバックを送る", RU: "Оставить отзыв" },
  "feedback.closeFeedback": { EN: "Close feedback", HT: "Fèmen kòmantè", FR: "Fermer le retour", ES: "Cerrar comentarios", PT: "Fechar feedback", AR: "إغلاق الملاحظات", ZH: "关闭反馈", DE: "Feedback schließen", JA: "フィードバックを閉じる", RU: "Закрыть отзыв" },

  // ── CoGuardians Panel ──
  "guardians.permissions_label": { EN: "Permissions", HT: "Pèmisyon", FR: "Permissions", ES: "Permisos", PT: "Permissões", AR: "صلاحيات", ZH: "权限", DE: "Berechtigungen", JA: "権限", RU: "Разрешения" },
  "guardians.viewProgress": { EN: "View Student Progress", HT: "Wè pwogrè elèv", FR: "Voir les progrès", ES: "Ver progreso del estudiante", PT: "Ver progresso do aluno", AR: "عرض تقدم الطالب", ZH: "查看学生进度", DE: "Schülerfortschritt anzeigen", JA: "生徒の進捗を表示", RU: "Просмотр прогресса ученика" },
  "guardians.receiveSOS": { EN: "Receive SOS Alerts", HT: "Resevwa alèt SOS", FR: "Recevoir les alertes SOS", ES: "Recibir alertas SOS", PT: "Receber alertas SOS", AR: "تلقي تنبيهات SOS", ZH: "接收SOS警报", DE: "SOS-Warnungen erhalten", JA: "SOSアラートを受信", RU: "Получать SOS-оповещения" },
  "guardians.approveRewards_label": { EN: "Approve & Deny Rewards", HT: "Apwouve rekonpans", FR: "Approuver les récompenses", ES: "Aprobar recompensas", PT: "Aprovar recompensas", AR: "الموافقة على المكافآت", ZH: "审批奖励", DE: "Belohnungen genehmigen", JA: "報酬を承認", RU: "Одобрять награды" },
  "guardians.editLessons": { EN: "Add & Edit Lessons", HT: "Modifye leson", FR: "Modifier les leçons", ES: "Editar lecciones", PT: "Editar aulas", AR: "تعديل الدروس", ZH: "编辑课程", DE: "Lektionen bearbeiten", JA: "レッスンを編集", RU: "Редактировать уроки" },
  "guardians.fullAccessLabel": { EN: "Full Access", HT: "Aksè konplè", FR: "Accès complet", ES: "Acceso total", PT: "Acesso completo", AR: "وصول كامل", ZH: "完全访问", DE: "Vollzugriff", JA: "フルアクセス", RU: "Полный доступ" },
  "guardians.permissionsQuestion": { EN: "What permissions will this co-guardian have?", HT: "Ki pèmisyon ko-gadyen sa a ap genyen?", FR: "Quelles permissions aura ce co-tuteur ?", ES: "¿Qué permisos tendrá este co-tutor?", PT: "Quais permissões terá este co-responsável?", AR: "ما الصلاحيات التي سيحصل عليها هذا الولي المشارك؟", ZH: "该共同监护人将拥有哪些权限？", DE: "Welche Berechtigungen wird dieser Mit-Erziehungsberechtigte haben?", JA: "この共同保護者にはどの権限がありますか？", RU: "Какие разрешения будут у этого со-опекуна?" },
  "guardians.sendInviteAsParent": { EN: "Send Invite as Parent", HT: "Voye envitasyon kòm paran", FR: "Envoyer l'invitation en tant que parent", ES: "Enviar invitación como padre", PT: "Enviar convite como responsável", AR: "إرسال الدعوة كولي أمر", ZH: "以家长身份发送邀请", DE: "Einladung als Elternteil senden", JA: "保護者として招待を送信", RU: "Отправить приглашение как родитель" },
  "guardians.coGuardianParent": { EN: "Co-Guardian (Parent)", HT: "Ko-Gadyen (Paran)", FR: "Co-tuteur (Parent)", ES: "Co-tutor (Padre)", PT: "Co-responsável (Pai)", AR: "ولي مشارك (والد)", ZH: "共同监护人（家长）", DE: "Mit-Erziehungsberechtigter (Elternteil)", JA: "共同保護者（保護者）", RU: "Со-опекун (Родитель)" },

  // ── Delete Account ──
  "profile.deleteAccountDesc": { EN: "This will permanently delete all your data — students, schedules, badges, and everything.", HT: "Sa a pral efase tout done ou — elèv, orè, badj, ak tout lòt enfòmasyon.", FR: "Cela supprimera définitivement toutes vos données.", ES: "Esto eliminará permanentemente todos sus datos.", PT: "Isso excluirá permanentemente todos os seus dados.", AR: "سيؤدي هذا إلى حذف جميع بياناتك بشكل دائم.", ZH: "这将永久删除您的所有数据。", DE: "Dies wird alle Ihre Daten dauerhaft löschen.", JA: "すべてのデータが完全に削除されます。", RU: "Это навсегда удалит все ваши данные." },
  "profile.deleteAccountWarning": { EN: "This action cannot be undone. Type DELETE to confirm.", HT: "Aksyon sa a pa ka defèt. Tape DELETE pou konfime.", FR: "Cette action est irréversible. Tapez DELETE pour confirmer.", ES: "Esta acción no se puede deshacer. Escriba DELETE para confirmar.", PT: "Esta ação não pode ser desfeita. Digite DELETE para confirmar.", AR: "لا يمكن التراجع عن هذا الإجراء. اكتب DELETE للتأكيد.", ZH: "此操作无法撤销。输入DELETE确认。", DE: "Diese Aktion kann nicht rückgängig gemacht werden. Geben Sie DELETE ein.", JA: "この操作は元に戻せません。DELETEと入力して確認してください。", RU: "Это действие нельзя отменить. Введите DELETE для подтверждения." },
  "profile.deleteMyAccount": { EN: "Delete My Account", HT: "Efase Kont Mwen", FR: "Supprimer mon compte", ES: "Eliminar mi cuenta", PT: "Excluir minha conta", AR: "حذف حسابي", ZH: "删除我的账户", DE: "Mein Konto löschen", JA: "アカウントを削除", RU: "Удалить мой аккаунт" },
  "profile.accountDeleted": { EN: "Account deleted", HT: "Kont efase", FR: "Compte supprimé", ES: "Cuenta eliminada", PT: "Conta excluída", AR: "تم حذف الحساب", ZH: "账户已删除", DE: "Konto gelöscht", JA: "アカウント削除済み", RU: "Аккаунт удалён" },

  // ── Learning Tools ──
  "tools.title": { EN: "Learning Tools", HT: "Zouti Aprantisaj", FR: "Outils d'apprentissage", ES: "Herramientas de aprendizaje", PT: "Ferramentas de aprendizagem", AR: "أدوات التعلم", ZH: "学习工具", DE: "Lernwerkzeuge", JA: "学習ツール", RU: "Учебные инструменты" },
  "tools.subtitle": { EN: "Platforms & resources for this student", HT: "Platfòm ak resous pou elèv la", FR: "Plateformes et ressources pour cet élève", ES: "Plataformas y recursos para este estudiante", PT: "Plataformas e recursos para este aluno", AR: "المنصات والموارد لهذا الطالب", ZH: "该学生的平台和资源", DE: "Plattformen und Ressourcen für diesen Schüler", JA: "この生徒のプラットフォームとリソース", RU: "Платформы и ресурсы для этого ученика" },
  "tools.addTool": { EN: "Add Tool", HT: "Ajoute", FR: "Ajouter un outil", ES: "Agregar herramienta", PT: "Adicionar ferramenta", AR: "إضافة أداة", ZH: "添加工具", DE: "Werkzeug hinzufügen", JA: "ツールを追加", RU: "Добавить инструмент" },
  "tools.addToolTitle": { EN: "Add Learning Tool", HT: "Ajoute Zouti", FR: "Ajouter un outil d'apprentissage", ES: "Agregar herramienta", PT: "Adicionar ferramenta", AR: "إضافة أداة تعلم", ZH: "添加学习工具", DE: "Lernwerkzeug hinzufügen", JA: "学習ツールを追加", RU: "Добавить инструмент" },
  "tools.noTools": { EN: "No tools added yet", HT: "Pa gen zouti ankò", FR: "Aucun outil ajouté", ES: "Sin herramientas aún", PT: "Nenhuma ferramenta adicionada", AR: "لم تتم إضافة أدوات", ZH: "尚未添加工具", DE: "Noch keine Werkzeuge", JA: "ツールがまだありません", RU: "Инструментов пока нет" },
  "tools.suggested": { EN: "Suggested Tools", HT: "Sijesyon", FR: "Outils suggérés", ES: "Herramientas sugeridas", PT: "Ferramentas sugeridas", AR: "أدوات مقترحة", ZH: "推荐工具", DE: "Vorgeschlagene Werkzeuge", JA: "おすすめツール", RU: "Рекомендуемые инструменты" },

  // ── Point Settings ──
  "points.perAction": { EN: "Point Values per Action", HT: "Valè Pwen pa Aksyon", FR: "Valeurs de points par action", ES: "Valores de puntos por acción", PT: "Valores de pontos por ação", AR: "قيم النقاط لكل إجراء", ZH: "每项操作的积分值", DE: "Punktwerte pro Aktion", JA: "アクションごとのポイント値", RU: "Значения очков за действие" },
  "points.customizeDesc": { EN: "Customize point values for each action. Disable to stop awarding.", HT: "Chanje valè pwen pou chak aksyon. Dezaktive pou pa bay pwen.", FR: "Personnalisez les valeurs de points. Désactivez pour arrêter d'attribuer.", ES: "Personalice los valores de puntos. Desactive para dejar de otorgar.", PT: "Personalize os valores de pontos. Desative para parar de conceder.", AR: "خصّص قيم النقاط. عطّل لإيقاف المنح.", ZH: "自定义每项操作的积分值。禁用即停止奖励。", DE: "Passen Sie die Punktwerte an. Deaktivieren zum Stoppen.", JA: "各アクションのポイント値をカスタマイズ。無効にすると付与停止。", RU: "Настройте значения очков. Отключите для прекращения начисления." },

  // ── Schedule Templates ──
  "schedule.saveTemplate": { EN: "Save Template", HT: "Sove Modèl", FR: "Enregistrer le modèle", ES: "Guardar plantilla", PT: "Salvar modelo", AR: "حفظ القالب", ZH: "保存模板", DE: "Vorlage speichern", JA: "テンプレートを保存", RU: "Сохранить шаблон" },
  "schedule.applyTemplate": { EN: "Apply Template", HT: "Aplike Modèl", FR: "Appliquer le modèle", ES: "Aplicar plantilla", PT: "Aplicar modelo", AR: "تطبيق القالب", ZH: "应用模板", DE: "Vorlage anwenden", JA: "テンプレートを適用", RU: "Применить шаблон" },
  "schedule.copyLastWeek": { EN: "Copy Last Week", HT: "Kopye Semèn Pase", FR: "Copier la semaine dernière", ES: "Copiar la semana pasada", PT: "Copiar semana anterior", AR: "نسخ الأسبوع الماضي", ZH: "复制上周", DE: "Letzte Woche kopieren", JA: "先週をコピー", RU: "Скопировать прошлую неделю" },
  "schedule.noBlocks": { EN: "No blocks to save", HT: "Pa gen blòk pou sove", FR: "Aucun bloc à enregistrer", ES: "No hay bloques para guardar", PT: "Nenhum bloco para salvar", AR: "لا توجد كتل للحفظ", ZH: "没有可保存的区块", DE: "Keine Blöcke zum Speichern", JA: "保存するブロックがありません", RU: "Нет блоков для сохранения" },
  "schedule.templateSaved": { EN: "Template saved!", HT: "Modèl sove!", FR: "Modèle enregistré !", ES: "¡Plantilla guardada!", PT: "Modelo salvo!", AR: "تم حفظ القالب!", ZH: "模板已保存！", DE: "Vorlage gespeichert!", JA: "テンプレートを保存しました！", RU: "Шаблон сохранён!" },
  "schedule.templateApplied": { EN: "Template applied!", HT: "Modèl aplike!", FR: "Modèle appliqué !", ES: "¡Plantilla aplicada!", PT: "Modelo aplicado!", AR: "تم تطبيق القالب!", ZH: "模板已应用！", DE: "Vorlage angewendet!", JA: "テンプレートを適用しました！", RU: "Шаблон применён!" },
  "schedule.noLastWeek": { EN: "No blocks from last week", HT: "Pa gen blòk semèn pase", FR: "Aucun bloc de la semaine dernière", ES: "No hay bloques de la semana pasada", PT: "Nenhum bloco da semana anterior", AR: "لا توجد كتل من الأسبوع الماضي", ZH: "上周没有区块", DE: "Keine Blöcke der letzten Woche", JA: "先週のブロックがありません", RU: "Нет блоков за прошлую неделю" },
  "schedule.lastWeekCopied": { EN: "Last week copied!", HT: "Semèn pase kopye!", FR: "Semaine dernière copiée !", ES: "¡Semana pasada copiada!", PT: "Semana anterior copiada!", AR: "تم نسخ الأسبوع الماضي!", ZH: "上周已复制！", DE: "Letzte Woche kopiert!", JA: "先週をコピーしました！", RU: "Прошлая неделя скопирована!" },
  "schedule.saveScheduleTemplate": { EN: "Save Schedule Template", HT: "Sove Modèl Orè", FR: "Enregistrer le modèle d'horaire", ES: "Guardar plantilla de horario", PT: "Salvar modelo de agenda", AR: "حفظ قالب الجدول", ZH: "保存课程表模板", DE: "Stundenplanvorlage speichern", JA: "スケジュールテンプレートを保存", RU: "Сохранить шаблон расписания" },
  "schedule.templateName": { EN: "Template name", HT: "Non modèl", FR: "Nom du modèle", ES: "Nombre de la plantilla", PT: "Nome do modelo", AR: "اسم القالب", ZH: "模板名称", DE: "Vorlagenname", JA: "テンプレート名", RU: "Название шаблона" },
  "schedule.chooseTemplate": { EN: "Choose a template", HT: "Chwazi yon modèl", FR: "Choisir un modèle", ES: "Elegir una plantilla", PT: "Escolher um modelo", AR: "اختر قالبًا", ZH: "选择模板", DE: "Vorlage auswählen", JA: "テンプレートを選択", RU: "Выбрать шаблон" },
  "schedule.apply": { EN: "Apply", HT: "Aplike", FR: "Appliquer", ES: "Aplicar", PT: "Aplicar", AR: "تطبيق", ZH: "应用", DE: "Anwenden", JA: "適用", RU: "Применить" },

  // ── Student Profile Card ──
  "profile.edit": { EN: "Edit", HT: "Modifye", FR: "Modifier", ES: "Editar", PT: "Editar", AR: "تعديل", ZH: "编辑", DE: "Bearbeiten", JA: "編集", RU: "Изменить" },
  "profile.age": { EN: "Age", HT: "Laj", FR: "Âge", ES: "Edad", PT: "Idade", AR: "العمر", ZH: "年龄", DE: "Alter", JA: "年齢", RU: "Возраст" },
  "profile.nationality": { EN: "Nationality", HT: "Nasyonalite", FR: "Nationalité", ES: "Nacionalidad", PT: "Nacionalidade", AR: "الجنسية", ZH: "国籍", DE: "Nationalität", JA: "国籍", RU: "Национальность" },
  "profile.enrolled": { EN: "Enrolled", HT: "Enskripsyon", FR: "Inscrit", ES: "Inscrito", PT: "Matriculado", AR: "مسجل", ZH: "注册日期", DE: "Eingeschrieben", JA: "登録日", RU: "Зачислен" },
  "profile.parentGuardian": { EN: "Parent / Guardian", HT: "Paran / Gadyen", FR: "Parent / Tuteur", ES: "Padre / Tutor", PT: "Pai / Responsável", AR: "ولي الأمر", ZH: "家长/监护人", DE: "Elternteil / Erziehungsberechtigter", JA: "保護者", RU: "Родитель / Опекун" },
  "profile.completion": { EN: "Completion", HT: "Konplete", FR: "Achèvement", ES: "Completado", PT: "Conclusão", AR: "الإنجاز", ZH: "完成率", DE: "Abschluss", JA: "完了率", RU: "Завершение" },
  "profile.blocks": { EN: "Blocks", HT: "Blòk", FR: "Blocs", ES: "Bloques", PT: "Blocos", AR: "كتل", ZH: "区块", DE: "Blöcke", JA: "ブロック", RU: "Блоки" },
  "profile.badges": { EN: "Badges", HT: "Badj", FR: "Badges", ES: "Insignias", PT: "Insígnias", AR: "شارات", ZH: "徽章", DE: "Abzeichen", JA: "バッジ", RU: "Значки" },
  "profile.editProfile": { EN: "Edit Profile", HT: "Modifye Pwofil", FR: "Modifier le profil", ES: "Editar perfil", PT: "Editar perfil", AR: "تعديل الملف", ZH: "编辑资料", DE: "Profil bearbeiten", JA: "プロフィールを編集", RU: "Редактировать профиль" },
  "profile.fullName": { EN: "Full Name", HT: "Non", FR: "Nom complet", ES: "Nombre completo", PT: "Nome completo", AR: "الاسم الكامل", ZH: "全名", DE: "Vollständiger Name", JA: "フルネーム", RU: "Полное имя" },
  "profile.dateOfBirth": { EN: "Date of Birth", HT: "Dat Nesans", FR: "Date de naissance", ES: "Fecha de nacimiento", PT: "Data de nascimento", AR: "تاريخ الميلاد", ZH: "出生日期", DE: "Geburtsdatum", JA: "生年月日", RU: "Дата рождения" },
  "profile.address": { EN: "Address", HT: "Adrès", FR: "Adresse", ES: "Dirección", PT: "Endereço", AR: "العنوان", ZH: "地址", DE: "Adresse", JA: "住所", RU: "Адрес" },
  "profile.gradeLevel": { EN: "Grade Level", HT: "Nivo", FR: "Niveau scolaire", ES: "Nivel escolar", PT: "Nível escolar", AR: "المستوى الدراسي", ZH: "年级", DE: "Klassenstufe", JA: "学年", RU: "Класс" },
  "profile.academicYear": { EN: "Academic Year", HT: "Ane Akademik", FR: "Année scolaire", ES: "Año académico", PT: "Ano letivo", AR: "العام الدراسي", ZH: "学年", DE: "Schuljahr", JA: "学年度", RU: "Учебный год" },
  "profile.parentInfo": { EN: "Parent Information", HT: "Enfòmasyon Paran", FR: "Informations du parent", ES: "Información del padre", PT: "Informações do responsável", AR: "معلومات ولي الأمر", ZH: "家长信息", DE: "Elterninformationen", JA: "保護者情報", RU: "Информация о родителе" },
  "profile.parentName": { EN: "Parent Name", HT: "Non Paran", FR: "Nom du parent", ES: "Nombre del padre", PT: "Nome do responsável", AR: "اسم ولي الأمر", ZH: "家长姓名", DE: "Name des Elternteils", JA: "保護者名", RU: "Имя родителя" },
  "profile.profilePhoto": { EN: "Profile Photo", HT: "Foto Pwofil", FR: "Photo de profil", ES: "Foto de perfil", PT: "Foto de perfil", AR: "صورة الملف", ZH: "个人照片", DE: "Profilfoto", JA: "プロフィール写真", RU: "Фото профиля" },
  "profile.photoOptional": { EN: "Optional — tap to add", HT: "Opsyonèl — klike pou ajoute", FR: "Optionnel — appuyez pour ajouter", ES: "Opcional — toque para agregar", PT: "Opcional — toque para adicionar", AR: "اختياري — اضغط للإضافة", ZH: "可选 — 点击添加", DE: "Optional — zum Hinzufügen tippen", JA: "任意 — タップして追加", RU: "Необязательно — нажмите для добавления" },

  // ── Student Switcher ──
  "student.gradeLabel": { EN: "Grade", HT: "Klas", FR: "Classe", ES: "Grado", PT: "Série", AR: "الصف", ZH: "年级", DE: "Klasse", JA: "学年", RU: "Класс" },

  // ── Add Student Full Form steps ──
  "student.stepOf": { EN: "Step {{step}} of 3", HT: "Etap {{step}} nan 3", FR: "Étape {{step}} sur 3", ES: "Paso {{step}} de 3", PT: "Etapa {{step}} de 3", AR: "الخطوة {{step}} من 3", ZH: "第{{step}}步/共3步", DE: "Schritt {{step}} von 3", JA: "ステップ {{step}}/3", RU: "Шаг {{step}} из 3" },
  "student.personalInfo": { EN: "Personal Information", HT: "Enfòmasyon Pèsonèl", FR: "Informations personnelles", ES: "Información personal", PT: "Informações pessoais", AR: "معلومات شخصية", ZH: "个人信息", DE: "Persönliche Informationen", JA: "個人情報", RU: "Личная информация" },
  "student.scheduleDocs": { EN: "Schedule & Documents", HT: "Orè & Dokiman", FR: "Horaire et documents", ES: "Horario y documentos", PT: "Agenda e documentos", AR: "الجدول والمستندات", ZH: "课程表和文件", DE: "Stundenplan und Dokumente", JA: "スケジュールと書類", RU: "Расписание и документы" },
  "student.reviewSubmit": { EN: "Review & Submit", HT: "Revize & Soumèt", FR: "Vérifier et soumettre", ES: "Revisar y enviar", PT: "Revisar e enviar", AR: "مراجعة وإرسال", ZH: "检查并提交", DE: "Überprüfen und absenden", JA: "確認して送信", RU: "Проверить и отправить" },
  "student.uploadSchedule": { EN: "Upload Schedule Document", HT: "Telechaje Dokiman Orè", FR: "Télécharger le document d'horaire", ES: "Subir documento de horario", PT: "Enviar documento de agenda", AR: "رفع مستند الجدول", ZH: "上传课程表文件", DE: "Stundenplan-Dokument hochladen", JA: "スケジュール文書をアップロード", RU: "Загрузить документ расписания" },
  "student.uploadScheduleDesc": { EN: "CSV, Excel, PDF, or photo of schedule — AI will extract the data", HT: "CSV, Excel, PDF, oswa foto orè — AI ap ekstrè done yo", FR: "CSV, Excel, PDF ou photo — l'IA extraira les données", ES: "CSV, Excel, PDF o foto — la IA extraerá los datos", PT: "CSV, Excel, PDF ou foto — a IA extrairá os dados", AR: "CSV أو Excel أو PDF أو صورة — الذكاء الاصطناعي سيستخرج البيانات", ZH: "CSV、Excel、PDF或课程表照片 — AI将提取数据", DE: "CSV, Excel, PDF oder Foto — KI extrahiert die Daten", JA: "CSV、Excel、PDF、またはスケジュールの写真 — AIがデータを抽出します", RU: "CSV, Excel, PDF или фото — ИИ извлечёт данные" },
  "student.extracting": { EN: "Extracting...", HT: "Ap ekstrè...", FR: "Extraction...", ES: "Extrayendo...", PT: "Extraindo...", AR: "جارٍ الاستخراج...", ZH: "提取中...", DE: "Wird extrahiert...", JA: "抽出中...", RU: "Извлечение..." },
  "student.chooseFile": { EN: "Choose File", HT: "Chwazi Fichye", FR: "Choisir un fichier", ES: "Elegir archivo", PT: "Escolher arquivo", AR: "اختر ملفًا", ZH: "选择文件", DE: "Datei auswählen", JA: "ファイルを選択", RU: "Выбрать файл" },
  "student.extractedSchedule": { EN: "Extracted Schedule", HT: "Orè Ekstrè", FR: "Horaire extrait", ES: "Horario extraído", PT: "Agenda extraída", AR: "الجدول المُستخرج", ZH: "已提取的课程表", DE: "Extrahierter Stundenplan", JA: "抽出されたスケジュール", RU: "Извлечённое расписание" },
  "student.addRow": { EN: "Add Row", HT: "Ajoute", FR: "Ajouter une ligne", ES: "Agregar fila", PT: "Adicionar linha", AR: "إضافة صف", ZH: "添加行", DE: "Zeile hinzufügen", JA: "行を追加", RU: "Добавить строку" },
  "student.validateSchedule": { EN: "Validate Schedule", HT: "Valide Orè", FR: "Valider l'horaire", ES: "Validar horario", PT: "Validar agenda", AR: "التحقق من الجدول", ZH: "验证课程表", DE: "Stundenplan validieren", JA: "スケジュールを検証", RU: "Проверить расписание" },
  "student.scheduleValidated": { EN: "Schedule validated!", HT: "Orè valide!", FR: "Horaire validé !", ES: "¡Horario validado!", PT: "Agenda validada!", AR: "تم التحقق من الجدول!", ZH: "课程表已验证！", DE: "Stundenplan validiert!", JA: "スケジュール検証済み！", RU: "Расписание проверено!" },
  "student.skipStep": { EN: "You can skip this step and add the schedule later.", HT: "Ou ka sote etap sa a epi ajoute orè aprè.", FR: "Vous pouvez passer cette étape et ajouter l'horaire plus tard.", ES: "Puede omitir este paso y agregar el horario después.", PT: "Você pode pular esta etapa e adicionar a agenda depois.", AR: "يمكنك تخطي هذه الخطوة وإضافة الجدول لاحقًا.", ZH: "您可以跳过此步骤，稍后添加课程表。", DE: "Sie können diesen Schritt überspringen und den Stundenplan später hinzufügen.", JA: "このステップをスキップして後でスケジュールを追加できます。", RU: "Вы можете пропустить этот шаг и добавить расписание позже." },
  "student.defaultTracks": { EN: "Default tracks:", HT: "Pist pa defo:", FR: "Pistes par défaut :", ES: "Pistas predeterminadas:", PT: "Trilhas padrão:", AR: "المسارات الافتراضية:", ZH: "默认学习轨道：", DE: "Standard-Kurse:", JA: "デフォルトトラック：", RU: "Треки по умолчанию:" },
  "student.cannotExtract": { EN: "Could not extract schedule data", HT: "Pa ka ekstrè orè a", FR: "Impossible d'extraire les données", ES: "No se pudieron extraer los datos", PT: "Não foi possível extrair os dados", AR: "تعذر استخراج بيانات الجدول", ZH: "无法提取课程表数据", DE: "Stundenplan-Daten konnten nicht extrahiert werden", JA: "スケジュールデータを抽出できませんでした", RU: "Не удалось извлечь данные расписания" },
  "student.extractionError": { EN: "Error extracting schedule", HT: "Erè nan ekstraksyon", FR: "Erreur d'extraction", ES: "Error al extraer", PT: "Erro ao extrair", AR: "خطأ في الاستخراج", ZH: "提取出错", DE: "Extraktionsfehler", JA: "抽出エラー", RU: "Ошибка извлечения" },

  // ── Tutor Chat ──
  "tutor.subtitle": { EN: "Your AI Study Buddy", HT: "Pwofesè AI ou", FR: "Votre assistant d'étude IA", ES: "Tu compañero de estudio IA", PT: "Seu assistente de estudos IA", AR: "رفيق الدراسة بالذكاء الاصطناعي", ZH: "你的AI学习伙伴", DE: "Dein KI-Lernpartner", JA: "AIスタディバディ", RU: "Ваш ИИ-помощник" },
  "tutor.greeting": { EN: "Hi! I'm Mr A 👋", HT: "Bonjou! Mwen se Mr A 👋", FR: "Salut ! Je suis Mr A 👋", ES: "¡Hola! Soy Mr A 👋", PT: "Olá! Sou Mr A 👋", AR: "مرحبًا! أنا Mr A 👋", ZH: "你好！我是Mr A 👋", DE: "Hallo! Ich bin Mr A 👋", JA: "こんにちは！Mr Aです 👋", RU: "Привет! Я Mr A 👋" },
  "tutor.intro": { EN: "I can help with any subject. Pick a topic, upload a file, or ask me anything!", HT: "M ka ede ou ak nenpòt matyè. Chwazi yon matyè, voye yon fichye, oswa poze m yon kesyon!", FR: "Je peux aider avec n'importe quel sujet. Choisissez un sujet, envoyez un fichier ou posez-moi une question !", ES: "Puedo ayudar con cualquier materia. Elige un tema, sube un archivo o pregúntame lo que sea.", PT: "Posso ajudar com qualquer matéria. Escolha um tema, envie um arquivo ou me pergunte qualquer coisa!", AR: "يمكنني المساعدة في أي مادة. اختر موضوعًا، ارفع ملفًا، أو اسألني أي شيء!", ZH: "我可以帮助任何科目。选择一个话题、上传文件或问我任何问题！", DE: "Ich kann bei jedem Fach helfen. Wähle ein Thema, lade eine Datei hoch oder frag mich!", JA: "どの科目でもお手伝いできます。トピックを選んで、ファイルをアップロード、または何でも聞いてください！", RU: "Могу помочь с любым предметом. Выберите тему, загрузите файл или спросите что угодно!" },
  "tutor.historyClearedToast": { EN: "History cleared", HT: "Istwa efase", FR: "Historique effacé", ES: "Historial borrado", PT: "Histórico limpo", AR: "تم مسح السجل", ZH: "历史已清除", DE: "Verlauf gelöscht", JA: "履歴をクリア", RU: "История очищена" },
  "tutor.allSubjects": { EN: "All Subjects", HT: "Tout Matyè", FR: "Toutes les matières", ES: "Todas las materias", PT: "Todas as matérias", AR: "جميع المواد", ZH: "所有科目", DE: "Alle Fächer", JA: "全科目", RU: "Все предметы" },
  "tutor.math": { EN: "Math", HT: "Matematik", FR: "Mathématiques", ES: "Matemáticas", PT: "Matemática", AR: "رياضيات", ZH: "数学", DE: "Mathematik", JA: "数学", RU: "Математика" },
  "tutor.science": { EN: "Science", HT: "Syans", FR: "Sciences", ES: "Ciencias", PT: "Ciências", AR: "علوم", ZH: "科学", DE: "Naturwissenschaften", JA: "科学", RU: "Наука" },
  "tutor.english": { EN: "English", HT: "Angle", FR: "Anglais", ES: "Inglés", PT: "Inglês", AR: "إنجليزي", ZH: "英语", DE: "Englisch", JA: "英語", RU: "Английский" },
  "tutor.social": { EN: "Social Studies", HT: "Etid Sosyal", FR: "Études sociales", ES: "Estudios sociales", PT: "Estudos sociais", AR: "دراسات اجتماعية", ZH: "社会学", DE: "Sozialkunde", JA: "社会科", RU: "Обществознание" },
  "tutor.esl": { EN: "ESL", HT: "ESL", FR: "FLE", ES: "ELE", PT: "ESL", AR: "ESL", ZH: "ESL", DE: "DaF", JA: "ESL", RU: "ESL" },
  "report.downloadPdf": { EN: "Download Report PDF", HT: "Telechaje Rapò PDF", FR: "Télécharger le rapport PDF", ES: "Descargar informe PDF", PT: "Baixar relatório PDF", AR: "تحميل تقرير PDF", ZH: "下载PDF报告", DE: "Bericht als PDF herunterladen", JA: "レポートPDFをダウンロード", RU: "Скачать отчёт PDF" },
  "report.subjectBreakdown": { EN: "Subject Breakdown", HT: "Pa Matyè", FR: "Répartition par matière", ES: "Desglose por materia", PT: "Divisão por matéria", AR: "تفصيل حسب المادة", ZH: "科目明细", DE: "Aufschlüsselung nach Fach", JA: "科目別内訳", RU: "Разбивка по предметам" },
  "report.dailyBreakdown": { EN: "Daily Breakdown", HT: "Chak Jou", FR: "Détail quotidien", ES: "Desglose diario", PT: "Detalhamento diário", AR: "التفصيل اليومي", ZH: "每日明细", DE: "Tagesaufschlüsselung", JA: "日別内訳", RU: "Ежедневная разбивка" },
  "report.sent": { EN: "Report sent!", HT: "Rapò voye!", FR: "Rapport envoyé !", ES: "¡Informe enviado!", PT: "Relatório enviado!", AR: "تم إرسال التقرير!", ZH: "报告已发送！", DE: "Bericht gesendet!", JA: "レポート送信完了！", RU: "Отчёт отправлен!" },

  // ── Account Merge ──
  "merge.title": { EN: "Merge Accounts", HT: "Mèj Kont", FR: "Fusionner les comptes", ES: "Fusionar cuentas", PT: "Mesclar contas", AR: "دمج الحسابات", ZH: "合并账户", DE: "Konten zusammenführen", JA: "アカウントを統合", RU: "Объединить аккаунты" },
  "merge.request": { EN: "Request", HT: "Demann", FR: "Demande", ES: "Solicitar", PT: "Solicitar", AR: "طلب", ZH: "请求", DE: "Anfrage", JA: "リクエスト", RU: "Запрос" },
  "merge.requestTitle": { EN: "Request Account Merge", HT: "Demann Mèj Kont", FR: "Demander la fusion des comptes", ES: "Solicitar fusión de cuentas", PT: "Solicitar mesclagem de contas", AR: "طلب دمج الحسابات", ZH: "请求合并账户", DE: "Kontenzusammenführung beantragen", JA: "アカウント統合をリクエスト", RU: "Запросить объединение аккаунтов" },
  "merge.warning": { EN: "This will send a request to the admin to transfer all student data from your old account to your current one. The old account will be deactivated after merge.", HT: "Sa a pral voye yon demann bay admin pou transfere tout done elèv soti nan ansyen kont ou ale nan kont aktyèl ou. Ansyen kont la ap dezaktive apre mèj la.", FR: "Cela enverra une demande à l'administrateur pour transférer toutes les données de votre ancien compte.", ES: "Esto enviará una solicitud al administrador para transferir los datos de su cuenta anterior.", PT: "Isso enviará uma solicitação ao administrador para transferir todos os dados da sua conta anterior.", AR: "سيرسل هذا طلبًا إلى المشرف لنقل جميع بيانات الطلاب من حسابك القديم.", ZH: "这将向管理员发送请求，将旧账户的所有学生数据转移到当前账户。", DE: "Dies sendet eine Anfrage an den Administrator, um Daten von Ihrem alten Konto zu übertragen.", JA: "管理者にリクエストを送信し、旧アカウントのデータを現在のアカウントに移行します。", RU: "Это отправит запрос администратору на перенос данных из старого аккаунта." },
  "merge.oldEmail": { EN: "Old account email", HT: "Imèl ansyen kont", FR: "Email de l'ancien compte", ES: "Email de la cuenta anterior", PT: "Email da conta anterior", AR: "بريد الحساب القديم", ZH: "旧账户邮箱", DE: "E-Mail des alten Kontos", JA: "旧アカウントのメール", RU: "Email старого аккаунта" },
  "merge.currentEmail": { EN: "Current account email", HT: "Imèl kont aktyèl", FR: "Email du compte actuel", ES: "Email de la cuenta actual", PT: "Email da conta atual", AR: "بريد الحساب الحالي", ZH: "当前账户邮箱", DE: "E-Mail des aktuellen Kontos", JA: "現在のアカウントのメール", RU: "Email текущего аккаунта" },
  "merge.reasonOptional": { EN: "Reason (optional)", HT: "Rezon (opsyonèl)", FR: "Raison (optionnel)", ES: "Razón (opcional)", PT: "Motivo (opcional)", AR: "السبب (اختياري)", ZH: "原因（可选）", DE: "Grund (optional)", JA: "理由（任意）", RU: "Причина (необязательно)" },
  "tutor.rateLimitReached": { EN: "Hourly limit reached for Mr A.", HT: "Ou rive limit èdtan ou pou Mr A.", FR: "Limite horaire atteinte pour Mr A.", ES: "Límite por hora alcanzado para Mr A.", PT: "Limite horário atingido para Mr A.", AR: "تم الوصول للحد الأقصى بالساعة لـ Mr A.", ZH: "Mr A的每小时限制已达到。", DE: "Stündliches Limit für Mr A erreicht.", JA: "Mr Aの1時間あたりの制限に達しました。", RU: "Достигнут часовой лимит Mr A." },
  "tutor.askPlaceholder": { EN: "Ask Mr A a question...", HT: "Ekri kesyon ou pou Mr A...", FR: "Posez une question à Mr A...", ES: "Haz una pregunta a Mr A...", PT: "Faça uma pergunta ao Mr A...", AR: "اسأل Mr A سؤالاً...", ZH: "向Mr A提问...", DE: "Stelle Mr A eine Frage...", JA: "Mr Aに質問...", RU: "Задайте вопрос Mr A..." },
  "merge.reasonPlaceholder": { EN: "Explain why you need to merge accounts", HT: "Eksplike poukisa ou bezwen mèj kont yo", FR: "Expliquez pourquoi vous devez fusionner les comptes", ES: "Explique por qué necesita fusionar las cuentas", PT: "Explique por que precisa mesclar as contas", AR: "اشرح لماذا تحتاج إلى دمج الحسابات", ZH: "说明为何需要合并账户", DE: "Erklären Sie, warum Sie die Konten zusammenführen müssen", JA: "アカウント統合が必要な理由を説明してください", RU: "Объясните, зачем нужно объединение аккаунтов" },
  "merge.submitRequest": { EN: "Submit Request", HT: "Soumèt Demann", FR: "Soumettre la demande", ES: "Enviar solicitud", PT: "Enviar solicitação", AR: "إرسال الطلب", ZH: "提交请求", DE: "Anfrage senden", JA: "リクエストを送信", RU: "Отправить запрос" },
  "merge.submitting": { EN: "Submitting...", HT: "Ap soumèt...", FR: "Envoi...", ES: "Enviando...", PT: "Enviando...", AR: "جارٍ الإرسال...", ZH: "提交中...", DE: "Wird gesendet...", JA: "送信中...", RU: "Отправка..." },
  "merge.submitted": { EN: "Merge request submitted! Admin will review.", HT: "Demann mèj soumèt! Admin ap revize.", FR: "Demande de fusion soumise ! L'administrateur va la examiner.", ES: "¡Solicitud de fusión enviada! El administrador la revisará.", PT: "Solicitação de mesclagem enviada! O administrador irá revisar.", AR: "تم إرسال طلب الدمج! سيراجعه المشرف.", ZH: "合并请求已提交！管理员将审核。", DE: "Zusammenführungsanfrage gesendet! Administrator wird prüfen.", JA: "統合リクエストが送信されました！管理者が確認します。", RU: "Запрос на объединение отправлен! Администратор рассмотрит." },
  "merge.duplicateDesc": { EN: "If you have duplicate accounts, request a merge. Admin will review and approve.", HT: "Si ou gen de kont, ou ka mande pou mèj yo. Admin ap revize epi apwouve.", FR: "Si vous avez des comptes en double, demandez une fusion.", ES: "Si tiene cuentas duplicadas, solicite una fusión.", PT: "Se tiver contas duplicadas, solicite uma mesclagem.", AR: "إذا كان لديك حسابات مكررة، اطلب دمجًا.", ZH: "如果您有重复账户，可以请求合并。", DE: "Bei doppelten Konten können Sie eine Zusammenführung beantragen.", JA: "重複アカウントがある場合、統合をリクエストできます。", RU: "При наличии дублирующихся аккаунтов запросите объединение." },
  "merge.approved": { EN: "Approved", HT: "Apwouve", FR: "Approuvé", ES: "Aprobado", PT: "Aprovado", AR: "موافق عليه", ZH: "已批准", DE: "Genehmigt", JA: "承認済み", RU: "Одобрено" },
  "merge.rejected": { EN: "Rejected", HT: "Rejte", FR: "Rejeté", ES: "Rechazado", PT: "Rejeitado", AR: "مرفوض", ZH: "已拒绝", DE: "Abgelehnt", JA: "拒否", RU: "Отклонено" },
  "merge.pending": { EN: "Pending", HT: "An atant", FR: "En attente", ES: "Pendiente", PT: "Pendente", AR: "قيد الانتظار", ZH: "待处理", DE: "Ausstehend", JA: "保留中", RU: "Ожидание" },
  "merge.enterEmail": { EN: "Please enter the email", HT: "Tanpri antre imèl la", FR: "Veuillez entrer l'email", ES: "Ingrese el email", PT: "Digite o email", AR: "يرجى إدخال البريد", ZH: "请输入邮箱", DE: "Bitte E-Mail eingeben", JA: "メールを入力してください", RU: "Введите email" },
  "merge.cannotSame": { EN: "Cannot merge with the same account", HT: "Pa ka mèje ak menm kont", FR: "Impossible de fusionner avec le même compte", ES: "No se puede fusionar con la misma cuenta", PT: "Não é possível mesclar com a mesma conta", AR: "لا يمكن الدمج مع نفس الحساب", ZH: "无法与同一账户合并", DE: "Kann nicht mit demselben Konto zusammengeführt werden", JA: "同じアカウントとは統合できません", RU: "Нельзя объединить с тем же аккаунтом" },

  // ── Weekly Report ──
  "report.weeklyReport": { EN: "Weekly Progress Report", HT: "Rapò Semèn", FR: "Rapport de progression hebdomadaire", ES: "Informe de progreso semanal", PT: "Relatório de progresso semanal", AR: "تقرير التقدم الأسبوعي", ZH: "每周进度报告", DE: "Wöchentlicher Fortschrittsbericht", JA: "週間進捗レポート", RU: "Еженедельный отчёт о прогрессе" },
  "report.week": { EN: "Week", HT: "Semèn", FR: "Semaine", ES: "Semana", PT: "Semana", AR: "أسبوع", ZH: "周", DE: "Woche", JA: "週", RU: "Неделя" },
  "report.completion": { EN: "Completion", HT: "Konplete", FR: "Achèvement", ES: "Completado", PT: "Conclusão", AR: "الإنجاز", ZH: "完成率", DE: "Abschluss", JA: "完了率", RU: "Завершение" },
  "report.streak": { EN: "Streak", HT: "Konsekitif", FR: "Série", ES: "Racha", PT: "Sequência", AR: "سلسلة", ZH: "连续", DE: "Serie", JA: "ストリーク", RU: "Серия" },
  "report.dayStreak": { EN: "day streak", HT: "jou konsekitif", FR: "jours consécutifs", ES: "días consecutivos", PT: "dias consecutivos", AR: "أيام متتالية", ZH: "天连续", DE: "Tage Serie", JA: "日間連続", RU: "дней подряд" },
  "report.pointsEarned": { EN: "Points", HT: "Pwen", FR: "Points", ES: "Puntos", PT: "Pontos", AR: "نقاط", ZH: "积分", DE: "Punkte", JA: "ポイント", RU: "Очки" },
  "report.earnedThisWeek": { EN: "earned this week", HT: "pwen genyen", FR: "gagnés cette semaine", ES: "ganados esta semana", PT: "ganhos esta semana", AR: "مكتسبة هذا الأسبوع", ZH: "本周获得", DE: "diese Woche verdient", JA: "今週獲得", RU: "заработано за неделю" },
  "report.noneThisWeek": { EN: "none this week", HT: "pa gen nouvo", FR: "aucun cette semaine", ES: "ninguno esta semana", PT: "nenhum esta semana", AR: "لا شيء هذا الأسبوع", ZH: "本周无", DE: "keine diese Woche", JA: "今週なし", RU: "нет за эту неделю" },
  "report.dailyCompletion": { EN: "Daily Completion", HT: "Konplete Chak Jou", FR: "Achèvement quotidien", ES: "Completado diario", PT: "Conclusão diária", AR: "الإنجاز اليومي", ZH: "每日完成", DE: "Täglicher Abschluss", JA: "日次完了", RU: "Ежедневное завершение" },
  "report.bySubject": { EN: "By Subject", HT: "Pa Matyè", FR: "Par matière", ES: "Por materia", PT: "Por matéria", AR: "حسب المادة", ZH: "按科目", DE: "Nach Fach", JA: "科目別", RU: "По предмету" },
  "report.remaining": { EN: "Remaining", HT: "Manke", FR: "Restant", ES: "Restante", PT: "Restante", AR: "متبقي", ZH: "剩余", DE: "Verbleibend", JA: "残り", RU: "Остаток" },
  "report.moodFocus": { EN: "Mood & Focus Trend", HT: "Imè & Konsantrasyon", FR: "Tendance humeur et concentration", ES: "Tendencia de ánimo y enfoque", PT: "Tendência de humor e foco", AR: "اتجاه المزاج والتركيز", ZH: "心情与专注趋势", DE: "Stimmungs- und Fokus-Trend", JA: "気分と集中力の傾向", RU: "Тренд настроения и концентрации" },
  "report.mood": { EN: "Mood", HT: "Imè", FR: "Humeur", ES: "Ánimo", PT: "Humor", AR: "المزاج", ZH: "心情", DE: "Stimmung", JA: "気分", RU: "Настроение" },
  "report.focus": { EN: "Focus", HT: "Konsantrasyon", FR: "Concentration", ES: "Enfoque", PT: "Foco", AR: "التركيز", ZH: "专注力", DE: "Fokus", JA: "集中力", RU: "Концентрация" },
  "report.avgScore": { EN: "Average Score", HT: "Mwayèn Nòt", FR: "Note moyenne", ES: "Puntuación promedio", PT: "Pontuação média", AR: "متوسط الدرجات", ZH: "平均分", DE: "Durchschnittsnote", JA: "平均点", RU: "Средний балл" },
  "report.sendReport": { EN: "Send Report", HT: "Voye Rapò", FR: "Envoyer le rapport", ES: "Enviar informe", PT: "Enviar relatório", AR: "إرسال التقرير", ZH: "发送报告", DE: "Bericht senden", JA: "レポートを送信", RU: "Отправить отчёт" },
  "report.sending": { EN: "Sending...", HT: "Ap voye...", FR: "Envoi...", ES: "Enviando...", PT: "Enviando...", AR: "جارٍ الإرسال...", ZH: "发送中...", DE: "Wird gesendet...", JA: "送信中...", RU: "Отправка..." },
  "report.sentSuccess": { EN: "Weekly report sent to Telegram!", HT: "Rapò voye nan Telegram!", FR: "Rapport envoyé sur Telegram !", ES: "¡Informe enviado a Telegram!", PT: "Relatório enviado para Telegram!", AR: "تم إرسال التقرير إلى Telegram!", ZH: "周报已发送到Telegram！", DE: "Wochenbericht an Telegram gesendet!", JA: "週次レポートをTelegramに送信しました！", RU: "Еженедельный отчёт отправлен в Telegram!" },
  "report.sendFailed": { EN: "Failed to send report", HT: "Echèk voye rapò", FR: "Échec de l'envoi du rapport", ES: "Error al enviar informe", PT: "Falha ao enviar relatório", AR: "فشل في إرسال التقرير", ZH: "发送报告失败", DE: "Bericht konnte nicht gesendet werden", JA: "レポート送信失敗", RU: "Ошибка отправки отчёта" },
  "report.pdfDownloaded": { EN: "PDF downloaded!", HT: "PDF telechaje!", FR: "PDF téléchargé !", ES: "¡PDF descargado!", PT: "PDF baixado!", AR: "تم تحميل PDF!", ZH: "PDF已下载！", DE: "PDF heruntergeladen!", JA: "PDFをダウンロードしました！", RU: "PDF скачан!" },
  "report.completionRate": { EN: "Completion Rate", HT: "Konplete", FR: "Taux d'achèvement", ES: "Tasa de completado", PT: "Taxa de conclusão", AR: "معدل الإنجاز", ZH: "完成率", DE: "Abschlussrate", JA: "完了率", RU: "Процент завершения" },
  "report.days": { EN: "days", HT: "jou", FR: "jours", ES: "días", PT: "dias", AR: "أيام", ZH: "天", DE: "Tage", JA: "日", RU: "дней" },
  "report.blocks": { EN: "blocks", HT: "blòk", FR: "blocs", ES: "bloques", PT: "blocos", AR: "كتل", ZH: "区块", DE: "Blöcke", JA: "ブロック", RU: "блоков" },
  "report.done": { EN: "done", HT: "fini", FR: "terminé", ES: "listo", PT: "feito", AR: "تم", ZH: "完成", DE: "erledigt", JA: "完了", RU: "готово" },

  // ── DadPanel nav ──
  "dadpanel.students": { EN: "Students", HT: "Elèv", FR: "Élèves", ES: "Estudiantes", PT: "Alunos", AR: "الطلاب", ZH: "学生", DE: "Schüler", JA: "生徒", RU: "Ученики" },
  "dadpanel.selectStudent": { EN: "Choose a student from the menu above to view their dashboard.", HT: "Chwazi yon elèv nan meni a pi wo a pou wè tablo yo.", FR: "Choisissez un élève dans le menu ci-dessus.", ES: "Seleccione un estudiante del menú de arriba.", PT: "Escolha um aluno no menu acima.", AR: "اختر طالبًا من القائمة أعلاه.", ZH: "从上方菜单选择一个学生。", DE: "Wählen Sie einen Schüler aus dem Menü oben.", JA: "上のメニューから生徒を選択してください。", RU: "Выберите ученика из меню выше." },
  "dadpanel.manageCoGuardians": { EN: "Co-Guardian Management", HT: "Jesyon Ko-Gadyen", FR: "Gestion des co-tuteurs", ES: "Gestión de co-tutores", PT: "Gestão de co-responsáveis", AR: "إدارة الأولياء المشاركين", ZH: "共同监护人管理", DE: "Mit-Erziehungsberechtigte verwalten", JA: "共同保護者管理", RU: "Управление со-опекунами" },
  "dadpanel.invitesAndPermissions": { EN: "Invites & permissions", HT: "Envitasyon ak pèmisyon", FR: "Invitations et permissions", ES: "Invitaciones y permisos", PT: "Convites e permissões", AR: "الدعوات والصلاحيات", ZH: "邀请和权限", DE: "Einladungen und Berechtigungen", JA: "招待と権限", RU: "Приглашения и разрешения" },

  // ── Notification Settings ──
  "notifications.title": { EN: "Notification Settings", HT: "Paramèt Notifikasyon", FR: "Paramètres de notification", ES: "Configuración de notificaciones", PT: "Configurações de notificação", AR: "إعدادات الإشعارات", ZH: "通知设置", DE: "Benachrichtigungseinstellungen", JA: "通知設定", RU: "Настройки уведомлений" },
  "notifications.configureDesc": { EN: "Configure how you want to receive notifications about your students' progress.", HT: "Konfigire kijan ou vle resevwa notifikasyon sou pwogrè elèv ou.", FR: "Configurez comment recevoir les notifications de progrès.", ES: "Configure cómo recibir notificaciones de progreso.", PT: "Configure como receber notificações de progresso.", AR: "اضبط كيفية تلقي الإشعارات حول تقدم طلابك.", ZH: "设置接收学生进度通知的方式。", DE: "Legen Sie fest, wie Sie Benachrichtigungen erhalten möchten.", JA: "生徒の進捗通知の受け取り方を設定してください。", RU: "Настройте способ получения уведомлений о прогрессе учеников." },
  "notifications.channel": { EN: "Notification Channel", HT: "Kanal Notifikasyon", FR: "Canal de notification", ES: "Canal de notificación", PT: "Canal de notificação", AR: "قناة الإشعارات", ZH: "通知渠道", DE: "Benachrichtigungskanal", JA: "通知チャンネル", RU: "Канал уведомлений" },
  "notifications.both": { EN: "Both", HT: "Tou de", FR: "Les deux", ES: "Ambos", PT: "Ambos", AR: "كلاهما", ZH: "两者", DE: "Beide", JA: "両方", RU: "Оба" },
  "notifications.hourlyAgent": { EN: "Hourly Monitoring Agent", HT: "Ajan Siveyans Chak Èdtan", FR: "Agent de surveillance horaire", ES: "Agente de monitoreo por hora", PT: "Agente de monitoramento horário", AR: "وكيل المراقبة كل ساعة", ZH: "每小时监控代理", DE: "Stündlicher Überwachungsagent", JA: "1時間ごとの監視エージェント", RU: "Ежечасный агент мониторинга" },
  "notifications.hourlyDesc": { EN: "Automatically track schedule compliance and send lateness alerts every hour", HT: "Otomatikman swiv pwogram ak voye alèt chak èdtan", FR: "Suivre automatiquement le respect des horaires et envoyer des alertes chaque heure", ES: "Seguir automáticamente el cumplimiento del horario y enviar alertas cada hora", PT: "Rastrear automaticamente o cumprimento da agenda e enviar alertas a cada hora", AR: "تتبع الالتزام بالجدول تلقائيًا وإرسال تنبيهات التأخر كل ساعة", ZH: "自动跟踪课程表执行情况并每小时发送迟到提醒", DE: "Stundenplan-Einhaltung automatisch verfolgen und stündlich Verspätungswarnungen senden", JA: "スケジュール遵守を自動追跡し、毎時遅延アラートを送信", RU: "Автоматически отслеживать соблюдение расписания и отправлять оповещения каждый час" },
  "notifications.enableWhatsApp": { EN: "Enable WhatsApp", HT: "Aktive WhatsApp", FR: "Activer WhatsApp", ES: "Activar WhatsApp", PT: "Ativar WhatsApp", AR: "تفعيل واتساب", ZH: "启用WhatsApp", DE: "WhatsApp aktivieren", JA: "WhatsAppを有効にする", RU: "Включить WhatsApp" },
  "notifications.whatsappNumber": { EN: "WhatsApp Number", HT: "Nimewo WhatsApp", FR: "Numéro WhatsApp", ES: "Número de WhatsApp", PT: "Número WhatsApp", AR: "رقم واتساب", ZH: "WhatsApp号码", DE: "WhatsApp-Nummer", JA: "WhatsApp番号", RU: "Номер WhatsApp" },
  "notifications.test": { EN: "Test", HT: "Teste", FR: "Tester", ES: "Probar", PT: "Testar", AR: "اختبار", ZH: "测试", DE: "Testen", JA: "テスト", RU: "Тест" },
  "notifications.testSent": { EN: "Test message sent!", HT: "Mesaj tès voye!", FR: "Message de test envoyé !", ES: "¡Mensaje de prueba enviado!", PT: "Mensagem de teste enviada!", AR: "تم إرسال رسالة الاختبار!", ZH: "测试消息已发送！", DE: "Testnachricht gesendet!", JA: "テストメッセージを送信しました！", RU: "Тестовое сообщение отправлено!" },
  "notifications.saved": { EN: "Notification settings saved!", HT: "Paramèt notifikasyon sove!", FR: "Paramètres de notification enregistrés !", ES: "¡Configuración de notificaciones guardada!", PT: "Configurações de notificação salvas!", AR: "تم حفظ إعدادات الإشعارات!", ZH: "通知设置已保存！", DE: "Benachrichtigungseinstellungen gespeichert!", JA: "通知設定を保存しました！", RU: "Настройки уведомлений сохранены!" },

  // ── Generic labels ──
  "label.name": { EN: "Name", HT: "Non", FR: "Nom", ES: "Nombre", PT: "Nome", AR: "الاسم", ZH: "名称", DE: "Name", JA: "名前", RU: "Имя" },
  "label.description": { EN: "Description", HT: "Deskripsyon", FR: "Description", ES: "Descripción", PT: "Descrição", AR: "الوصف", ZH: "描述", DE: "Beschreibung", JA: "説明", RU: "Описание" },
  "label.status": { EN: "Status", HT: "Eta", FR: "Statut", ES: "Estado", PT: "Status", AR: "الحالة", ZH: "状态", DE: "Status", JA: "ステータス", RU: "Статус" },
  "label.track": { EN: "Track", HT: "Pis", FR: "Piste", ES: "Pista", PT: "Trilha", AR: "مسار", ZH: "轨道", DE: "Kurs", JA: "トラック", RU: "Трек" },
  "label.score": { EN: "Score", HT: "Nòt", FR: "Note", ES: "Puntuación", PT: "Pontuação", AR: "الدرجة", ZH: "分数", DE: "Punktzahl", JA: "スコア", RU: "Оценка" },
  "label.schedule": { EN: "Schedule", HT: "Orè", FR: "Horaire", ES: "Horario", PT: "Agenda", AR: "جدول", ZH: "课程表", DE: "Stundenplan", JA: "スケジュール", RU: "Расписание" },
  "label.active": { EN: "Active", HT: "Aktif", FR: "Actif", ES: "Activo", PT: "Ativo", AR: "نشط", ZH: "活跃", DE: "Aktiv", JA: "アクティブ", RU: "Активный" },
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
