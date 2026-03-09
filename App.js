import { useEffect, useMemo, useState } from "react";

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getFactKey(a, b) {
  return `${a}x${b}`;
}

function pickWeightedQuestion(selectedTables, weakFacts, mode) {
  const pool = [];

  selectedTables.forEach((table) => {
    for (let multiplier = 1; multiplier <= 10; multiplier++) {
      const key = getFactKey(table, multiplier);
      const stats = weakFacts[key] || { right: 0, wrong: 0 };

      let weight = 1;

      if (mode !== "boss") {
        weight += stats.wrong * 3;
        weight -= stats.right * 0.3;
      }

      weight = Math.max(1, Math.round(weight));

      for (let i = 0; i < weight; i++) {
        pool.push({ a: table, b: multiplier });
      }
    }
  });

  return randomFromArray(pool);
}

export default function App() {
  const [selectedTables, setSelectedTables] = useState([2, 3, 4, 5]);
  const [a, setA] = useState(2);
  const [b, setB] = useState(3);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("practice");
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [challengeDone, setChallengeDone] = useState(0);
  const [showThinkingPrompt, setShowThinkingPrompt] = useState(false);

  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bossWins, setBossWins] = useState(0);
  const [weakFacts, setWeakFacts] = useState({});

  const challengeTarget = 10;

  const dinoBosses = [
    { name: "Vélo-Raptor", min: 0, icon: "🦖", size: "Petit boss" },
    { name: "Tricéra-Boom", min: 2, icon: "🦕", size: "Boss costaud" },
    { name: "Stégo-Tonnerre", min: 4, icon: "⚡", size: "Boss géant" },
    { name: "Spinosaure Suprême", min: 6, icon: "🔥", size: "Boss monstrueux" },
    { name: "Tyranno Max", min: 8, icon: "☄️", size: "Boss titan" },
    {
      name: "Giga Dino Colossal",
      min: 10,
      icon: "🌋",
      size: "Boss légendaire",
    },
  ];

  const currentBoss =
    [...dinoBosses].reverse().find((boss) => bossWins >= boss.min) ||
    dinoBosses[0];

  useEffect(() => {
    setShowThinkingPrompt(false);

    const timer = setTimeout(() => {
      setShowThinkingPrompt(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [a, b]);

  function newQuestion(
    nextTables = selectedTables,
    nextMode = mode,
    nextWeakFacts = weakFacts
  ) {
    const next = pickWeightedQuestion(nextTables, nextWeakFacts, nextMode);
    setA(next.a);
    setB(next.b);
    setAnswer("");
    setMessage("");
    setShowThinkingPrompt(false);
  }

  useEffect(() => {
    newQuestion(selectedTables, mode, weakFacts);
    // eslint-disable-next-line
  }, []);

  function toggleTable(table) {
    let updated;

    if (selectedTables.includes(table)) {
      if (selectedTables.length === 1) return;
      updated = selectedTables.filter((t) => t !== table);
    } else {
      updated = [...selectedTables, table].sort((x, y) => x - y);
    }

    setSelectedTables(updated);
    newQuestion(updated, mode, weakFacts);
  }

  function buildNextWeakFacts(correct) {
    const key = getFactKey(a, b);
    const current = weakFacts[key] || { right: 0, wrong: 0 };

    return {
      ...weakFacts,
      [key]: {
        right: current.right + (correct ? 1 : 0),
        wrong: current.wrong + (correct ? 0 : 1),
      },
    };
  }

  function checkAnswer() {
    const correct = parseInt(answer) === a * b;

    setAttempts((prev) => prev + 1);
    setShowThinkingPrompt(false);

    const nextWeakFacts = buildNextWeakFacts(correct);
    setWeakFacts(nextWeakFacts);

    if (correct) {
      setScore((prev) => prev + 1);

      const gainedXp = mode === "boss" ? 15 : mode === "challenge" ? 12 : 10;
      setXp((prev) => prev + gainedXp);

      setStreak((prev) => {
        const next = prev + 1;
        if (next > bestStreak) {
          setBestStreak(next);
        }
        return next;
      });

      if (mode === "challenge") {
        setChallengeDone((prev) => prev + 1);
      }

      if (mode === "boss" && streak + 1 >= 8) {
        setBossWins((prev) => prev + 1);
        setMessage(`Boss battu ! ${currentBoss.name} a reculé devant toi.`);
      } else {
        setMessage("Bravo, dino-génie !");
      }
    } else {
      setStreak(0);
      setMessage(`Oups ! La bonne réponse était ${a * b}.`);
    }

    newQuestion(selectedTables, mode, nextWeakFacts);
  }

  function switchMode(newMode) {
    setMode(newMode);
    if (newMode !== "challenge") {
      setChallengeDone(0);
    }
    setMessage("");
    newQuestion(selectedTables, newMode, weakFacts);
  }

  const percent = attempts === 0 ? 0 : Math.round((score / attempts) * 100);
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;

  const weakList = useMemo(() => {
    return Object.entries(weakFacts)
      .map(([key, value]) => ({
        key,
        wrong: value.wrong || 0,
        right: value.right || 0,
        priority: (value.wrong || 0) - (value.right || 0) * 0.3,
      }))
      .filter((item) => item.wrong > 0)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
  }, [weakFacts]);

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: 1000,
        margin: "0 auto",
        padding: 30,
        background: "#fffdf3",
        minHeight: "100vh",
        color: "#4c1d95",
      }}
    >
      <h1 style={{ color: "#6d28d9", marginBottom: 6 }}>
        🦖 Mission Dino-Maths
      </h1>
      <p style={{ color: "#6b21a8" }}>
        Explore, réfléchis et bats des dinosaures de plus en plus énormes.
      </p>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: "#5b21b6" }}>Choisir les tables</h3>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((table) => (
          <button
            key={table}
            onClick={() => toggleTable(table)}
            style={{
              margin: 4,
              padding: "10px 14px",
              borderRadius: 12,
              border: "2px solid #e9d5ff",
              background: selectedTables.includes(table)
                ? "#7c3aed"
                : "#ffffff",
              color: selectedTables.includes(table) ? "#ffffff" : "#4c1d95",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {table}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: "#5b21b6" }}>Mode d’aventure</h3>
        {[
          { key: "practice", label: "Exploration" },
          { key: "challenge", label: "Défi dino" },
          { key: "boss", label: "Combat de boss" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => switchMode(item.key)}
            style={{
              marginRight: 8,
              marginBottom: 8,
              padding: "10px 14px",
              borderRadius: 12,
              border: "2px solid #e9d5ff",
              background: mode === item.key ? "#7c3aed" : "#ffffff",
              color: mode === item.key ? "#ffffff" : "#4c1d95",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        style={{
          background: "#faf5ff",
          padding: 25,
          borderRadius: 24,
          marginBottom: 20,
          border: "2px solid #e9d5ff",
          boxShadow: "0 8px 24px rgba(124,58,237,0.08)",
        }}
      >
        <div style={{ marginBottom: 10, color: "#7e22ce", fontWeight: "bold" }}>
          {mode === "practice"
            ? "Mode exploration"
            : mode === "challenge"
            ? "Mode défi dino"
            : "Mode combat de boss"}
        </div>

        <h2 style={{ fontSize: 42, color: "#4c1d95" }}>
          {a} × {b} = ?
        </h2>

        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") checkAnswer();
          }}
          style={{
            fontSize: 22,
            padding: 10,
            borderRadius: 12,
            border: "2px solid #d8b4fe",
            width: 160,
            color: "#4c1d95",
          }}
        />

        <div style={{ marginTop: 14 }}>
          <button
            onClick={checkAnswer}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              background: "#7c3aed",
              color: "white",
              cursor: "pointer",
              marginRight: 10,
              fontWeight: "bold",
            }}
          >
            Attaquer
          </button>

          <button
            onClick={() => newQuestion()}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "2px solid #e9d5ff",
              background: "#ffffff",
              color: "#4c1d95",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Nouvelle trace
          </button>
        </div>

        {showThinkingPrompt && (
          <div
            style={{
              marginTop: 16,
              background: "#fef08a",
              color: "#713f12",
              padding: 14,
              borderRadius: 14,
              fontWeight: "bold",
            }}
          >
            Tu es bon, respire, dis ta technique de réflexion à voix haute :)
          </div>
        )}

        <h3 style={{ color: "#6b21a8" }}>{message}</h3>
      </div>

      <div
        style={{
          background: "#fff7cc",
          padding: 20,
          borderRadius: 24,
          marginBottom: 20,
          border: "2px solid #fde047",
        }}
      >
        <h3 style={{ color: "#713f12", marginTop: 0 }}>
          Boss dinosaure actuel
        </h3>
        <p
          style={{
            fontSize: 30,
            fontWeight: "bold",
            margin: "6px 0",
            color: "#5b21b6",
          }}
        >
          {currentBoss.icon} {currentBoss.name}
        </p>
        <p style={{ margin: 0, color: "#7c2d12", fontWeight: "bold" }}>
          {currentBoss.size} · Dinos vaincus : {bossWins}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Box label="Niveau" value={level} />
        <Box label="XP" value={xp} />
        <Box label="XP dans le niveau" value={`${xpInLevel}/100`} />
        <Box label="Score" value={score} />
        <Box label="Essais" value={attempts} />
        <Box label="Précision" value={`${percent}%`} />
        <Box label="Série actuelle" value={streak} />
        <Box label="Meilleure série" value={bestStreak} />
        <Box label="Dinos vaincus" value={bossWins} />
      </div>

      <div
        style={{
          background: "#faf5ff",
          padding: 20,
          borderRadius: 24,
          marginBottom: 20,
          border: "2px solid #e9d5ff",
        }}
      >
        <h3 style={{ color: "#5b21b6" }}>Défi dino</h3>
        <p
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: "bold",
            color: "#4c1d95",
          }}
        >
          {challengeDone}/{challengeTarget}
        </p>
      </div>

      <div
        style={{
          background: "#faf5ff",
          padding: 20,
          borderRadius: 24,
          border: "2px solid #e9d5ff",
        }}
      >
        <h3 style={{ color: "#5b21b6" }}>Empreintes à retravailler</h3>

        {weakList.length === 0 ? (
          <p style={{ color: "#6b21a8" }}>
            Aucune faiblesse détectée pour l’instant.
          </p>
        ) : (
          weakList.map((item) => (
            <div
              key={item.key}
              style={{
                background: "#ffffff",
                padding: 12,
                borderRadius: 14,
                marginBottom: 10,
                border: "2px solid #f3e8ff",
              }}
            >
              <strong style={{ color: "#4c1d95" }}>
                {item.key.replace("x", " × ")}
              </strong>
              <div style={{ color: "#6b21a8", marginTop: 4 }}>
                Erreurs : {item.wrong} · Réussites : {item.right}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Box({ label, value }) {
  return (
    <div
      style={{
        background: "#faf5ff",
        padding: 16,
        borderRadius: 18,
        border: "2px solid #e9d5ff",
      }}
    >
      <div style={{ color: "#6b21a8" }}>{label}</div>
      <strong style={{ fontSize: 24, color: "#4c1d95" }}>{value}</strong>
    </div>
  );
}
