import { useEffect, useMemo, useRef, useState } from "react";

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getFactKey(a, b) {
  return `${a}x${b}`;
}

function pickWeightedQuestion(selectedTables, weakFacts, mode, skipQueue = []) {
  const pool = [];

  selectedTables.forEach((table) => {
    for (let multiplier = 1; multiplier <= 10; multiplier++) {
      const key = getFactKey(table, multiplier);
      const stats = weakFacts[key] || { right: 0, wrong: 0 };

      let weight = 1;

      if (mode !== "boss") {
        weight += stats.wrong * 3;
        weight -= stats.right * 0.3;
      } else {
        weight += stats.wrong * 2;
      }

      weight = Math.max(1, Math.round(weight));

      for (let i = 0; i < weight; i++) {
        pool.push({ a: table, b: multiplier, key });
      }
    }
  });

  if (skipQueue.length > 0) {
    return {
      question: skipQueue[0],
      usedSkipQueue: true,
    };
  }

  return {
    question: randomFromArray(pool),
    usedSkipQueue: false,
  };
}

function getBossProfile(bossWins) {
  const bosses = [
    {
      name: "Vélo-Raptor",
      min: 0,
      icon: "🦖",
      size: "Petit boss",
      maxHealth: 8,
      timeLimit: 10,
    },
    {
      name: "Tricéra-Boom",
      min: 2,
      icon: "🦕",
      size: "Boss costaud",
      maxHealth: 10,
      timeLimit: 9,
    },
    {
      name: "Stégo-Tonnerre",
      min: 4,
      icon: "⚡",
      size: "Boss géant",
      maxHealth: 12,
      timeLimit: 8,
    },
    {
      name: "Spinosaure Suprême",
      min: 6,
      icon: "🔥",
      size: "Boss monstrueux",
      maxHealth: 14,
      timeLimit: 7,
    },
    {
      name: "Tyranno Max",
      min: 8,
      icon: "☄️",
      size: "Boss titan",
      maxHealth: 16,
      timeLimit: 6,
    },
    {
      name: "Giga Dino Colossal",
      min: 10,
      icon: "🌋",
      size: "Boss légendaire",
      maxHealth: 18,
      timeLimit: 5,
    },
  ];

  return (
    [...bosses].reverse().find((boss) => bossWins >= boss.min) || bosses[0]
  );
}

function getEggStage(level) {
  if (level <= 2) {
    return {
      icon: "🥚",
      name: "Œuf mystérieux",
      text: "Ton dino dort encore dans son œuf.",
    };
  }

  if (level <= 4) {
    return {
      icon: "🥚✨",
      name: "Œuf craquelé",
      text: "Ça bouge là-dedans. Ton dino se réveille.",
    };
  }

  if (level <= 6) {
    return {
      icon: "🐣🦖",
      name: "Bébé raptor",
      text: "Ton mini dino est sorti. Il apprend avec toi.",
    };
  }

  if (level <= 8) {
    return {
      icon: "🦖",
      name: "Jeune dino",
      text: "Ton dino grandit vite. Il devient solide.",
    };
  }

  if (level <= 11) {
    return {
      icon: "🦕",
      name: "Dino puissant",
      text: "Ton compagnon dino est maintenant très fort.",
    };
  }

  return {
    icon: "👑🦖",
    name: "Dino légendaire",
    text: "Ton dino est devenu une légende du Jurassique.",
  };
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
  const [showThinkingPrompt, setShowThinkingPrompt] = useState(false);

  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bossWins, setBossWins] = useState(0);
  const [weakFacts, setWeakFacts] = useState({});

  const [bossHealth, setBossHealth] = useState(getBossProfile(0).maxHealth);
  const [bossTimer, setBossTimer] = useState(getBossProfile(0).timeLimit);
  const [passesLeft, setPassesLeft] = useState(3);
  const [skipQueue, setSkipQueue] = useState([]);

  const [showBossVictory, setShowBossVictory] = useState(false);
  const [defeatedBossName, setDefeatedBossName] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  const timerRef = useRef(null);

  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const currentBoss = getBossProfile(bossWins);
  const eggStage = getEggStage(level);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function clearBossInterval() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startBossTimer(timeLimit, bossProfileOverride = currentBoss) {
    clearBossInterval();
    setBossTimer(timeLimit);

    timerRef.current = setInterval(() => {
      setBossTimer((prev) => {
        if (prev <= 1) {
          clearBossInterval();

          setStreak(0);
          setBossHealth((currentHealth) =>
            Math.min(bossProfileOverride.maxHealth, currentHealth + 2)
          );
          setMessage(
            `⏰ Trop tard ! ${bossProfileOverride.name} regagne 2 points de vie.`
          );

          window.setTimeout(() => {
            askNewQuestion(
              selectedTables,
              "boss",
              weakFacts,
              skipQueue,
              bossProfileOverride
            );
          }, 250);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  }

  function askNewQuestion(
    nextTables = selectedTables,
    nextMode = mode,
    nextWeakFacts = weakFacts,
    nextSkipQueue = skipQueue,
    bossProfileOverride = currentBoss
  ) {
    const result = pickWeightedQuestion(
      nextTables,
      nextWeakFacts,
      nextMode,
      nextSkipQueue
    );

    setA(result.question.a);
    setB(result.question.b);
    setAnswer("");
    setShowThinkingPrompt(false);

    if (nextMode === "practice") {
      clearBossInterval();
    }

    if (nextMode === "boss") {
      if (result.usedSkipQueue) {
        setSkipQueue((prev) => prev.slice(1));
      }
      startBossTimer(bossProfileOverride.timeLimit, bossProfileOverride);
    }
  }

  useEffect(() => {
    askNewQuestion(selectedTables, mode, weakFacts, skipQueue, currentBoss);
    return () => clearBossInterval();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (mode !== "practice") return;

    setShowThinkingPrompt(false);

    const timer = setTimeout(() => {
      setShowThinkingPrompt(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [a, b, mode]);

  useEffect(() => {
    if (mode === "boss" && !showBossVictory) {
      setBossHealth(currentBoss.maxHealth);
      setBossTimer(currentBoss.timeLimit);
      setPassesLeft(3);
      setSkipQueue([]);
      clearBossInterval();
      startBossTimer(currentBoss.timeLimit, currentBoss);
    } else {
      clearBossInterval();
    }
    // eslint-disable-next-line
  }, [bossWins]);

  function toggleTable(table) {
    let updated;

    if (selectedTables.includes(table)) {
      if (selectedTables.length === 1) return;
      updated = selectedTables.filter((t) => t !== table);
    } else {
      updated = [...selectedTables, table].sort((x, y) => x - y);
    }

    setSelectedTables(updated);
    askNewQuestion(updated, mode, weakFacts, skipQueue, currentBoss);
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
    const correct = parseInt(answer, 10) === a * b;

    setAttempts((prev) => prev + 1);
    setShowThinkingPrompt(false);

    const nextWeakFacts = buildNextWeakFacts(correct);
    setWeakFacts(nextWeakFacts);

    if (correct) {
      setScore((prev) => prev + 1);
      setXp((prev) => prev + (mode === "boss" ? 15 : 10));

      setStreak((prev) => {
        const next = prev + 1;
        if (next > bestStreak) {
          setBestStreak(next);
        }
        return next;
      });

      if (mode === "boss") {
        const damage = 1;
        const nextHealth = bossHealth - damage;

        if (nextHealth <= 0) {
          clearBossInterval();
          setDefeatedBossName(currentBoss.name);
          setShowBossVictory(true);
          setBossWins((prev) => prev + 1);
          setMessage("");
          return;
        } else {
          setBossHealth(nextHealth);
          setMessage(
            `Touché ! ${currentBoss.name} perd ${damage} points de vie.`
          );
        }
      } else {
        setMessage("Bravo, prends ton temps, tu réfléchis bien !");
      }
    } else {
      setStreak(0);

      if (mode === "boss") {
        const healed = Math.min(currentBoss.maxHealth, bossHealth + 1);
        setBossHealth(healed);
        setMessage(
          `Oups ! La bonne réponse était ${a * b}. ${
            currentBoss.name
          } regagne 1 point de vie.`
        );
      } else {
        setMessage(`Oups ! La bonne réponse était ${a * b}.`);
      }
    }

    askNewQuestion(selectedTables, mode, nextWeakFacts, skipQueue, currentBoss);
  }

  function handlePass() {
    if (mode === "practice") {
      askNewQuestion(selectedTables, mode, weakFacts, skipQueue, currentBoss);
      return;
    }

    if (passesLeft <= 0) return;

    const questionToRequeue = { a, b, key: getFactKey(a, b) };
    const updatedQueue = [...skipQueue, questionToRequeue];

    setSkipQueue(updatedQueue);
    setPassesLeft((prev) => prev - 1);
    setMessage("Question passée. Elle reviendra plus tard.");
    askNewQuestion(
      selectedTables,
      "boss",
      weakFacts,
      updatedQueue,
      currentBoss
    );
  }

  function continueAfterBossVictory() {
    const nextBoss = getBossProfile(bossWins);

    setShowBossVictory(false);
    setMessage("Super ! Tu passes au prochain boss 🦖");
    setBossHealth(nextBoss.maxHealth);
    setBossTimer(nextBoss.timeLimit);
    setPassesLeft(3);
    setSkipQueue([]);
    askNewQuestion(selectedTables, "boss", weakFacts, [], nextBoss);
  }

  function switchMode(newMode) {
    clearBossInterval();
    setMode(newMode);
    setMessage("");
    setAnswer("");
    setShowThinkingPrompt(false);
    setShowBossVictory(false);

    if (newMode === "boss") {
      const boss = getBossProfile(bossWins);
      setBossHealth(boss.maxHealth);
      setBossTimer(boss.timeLimit);
      setPassesLeft(3);
      setSkipQueue([]);
      window.setTimeout(() => {
        askNewQuestion(selectedTables, "boss", weakFacts, [], boss);
      }, 0);
    } else {
      setSkipQueue([]);
      window.setTimeout(() => {
        askNewQuestion(selectedTables, "practice", weakFacts, [], currentBoss);
      }, 0);
    }
  }

  const percent = attempts === 0 ? 0 : Math.round((score / attempts) * 100);

  const weakList = useMemo(() => {
    return Object.entries(weakFacts)
      .map(([key, value]) => ({
        key,
        wrong: value.wrong || 0,
        right: value.right || 0,
        priority: (value.wrong || 0) - (value.right || 0) * 0.3,
      }))
      .filter((item) => item.wrong > 0)
      .sort((aItem, bItem) => bItem.priority - aItem.priority)
      .slice(0, 5);
  }, [weakFacts]);

  const bossHealthPercent = Math.round(
    (bossHealth / currentBoss.maxHealth) * 100
  );
  const bossTimePercent = Math.max(
    0,
    Math.round((bossTimer / currentBoss.timeLimit) * 100)
  );

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: 1000,
        margin: "0 auto",
        background: "#fffdf3",
        minHeight: "100svh",
        color: "#4c1d95",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#fffdf3",
          padding: isMobile ? "10px 10px 8px" : "20px 20px 12px",
          borderBottom: "1px solid #f3e8ff",
        }}
      >
        <h1
          style={{
            color: "#6d28d9",
            marginBottom: 6,
            marginTop: 0,
            fontSize: isMobile ? 28 : 32,
          }}
        >
          🦖 Mission Dino-Maths
        </h1>

        <p style={{ color: "#6b21a8", marginTop: 0 }}>
          Explore, réfléchis et bats des dinosaures de plus en plus énormes.
        </p>

        <div style={{ marginBottom: 14 }}>
          <h3 style={{ color: "#5b21b6", marginBottom: 8 }}>Choisir les tables</h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((table) => (
              <button
                key={table}
                onClick={() => toggleTable(table)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "2px solid #e9d5ff",
                  background: selectedTables.includes(table)
                    ? "#7c3aed"
                    : "#ffffff",
                  color: selectedTables.includes(table) ? "#ffffff" : "#4c1d95",
                  cursor: "pointer",
                  fontWeight: "bold",
                  minHeight: 44,
                }}
              >
                {table}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <h3 style={{ color: "#5b21b6", marginBottom: 8 }}>Mode d’aventure</h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {[
              { key: "practice", label: "Pratique" },
              { key: "boss", label: "Combat de boss" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => switchMode(item.key)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "2px solid #e9d5ff",
                  background: mode === item.key ? "#7c3aed" : "#ffffff",
                  color: mode === item.key ? "#ffffff" : "#4c1d95",
                  cursor: "pointer",
                  fontWeight: "bold",
                  minHeight: 44,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#fff7cc",
            padding: isMobile ? 14 : 20,
            borderRadius: 24,
            marginBottom: 12,
            border: "2px solid #fde047",
          }}
        >
          <h3 style={{ color: "#713f12", marginTop: 0, marginBottom: 8 }}>
            Œuf de dinosaure
          </h3>
          <p
            style={{
              fontSize: isMobile ? 28 : 34,
              fontWeight: "bold",
              margin: "6px 0",
              color: "#5b21b6",
            }}
          >
            {eggStage.icon} {eggStage.name}
          </p>
          <p style={{ margin: 0, color: "#7c2d12", fontWeight: "bold" }}>
            {eggStage.text}
          </p>
        </div>

        <div
          style={{
            background: "#fff7cc",
            padding: isMobile ? 14 : 20,
            borderRadius: 24,
            border: "2px solid #fde047",
          }}
        >
          <h3 style={{ color: "#713f12", marginTop: 0, marginBottom: 8 }}>
            Boss dinosaure actuel
          </h3>

          <p
            style={{
              fontSize: isMobile ? 24 : 30,
              fontWeight: "bold",
              margin: "6px 0",
              color: "#5b21b6",
            }}
          >
            {currentBoss.icon} {currentBoss.name}
          </p>

          <p
            style={{
              margin: "0 0 10px 0",
              color: "#7c2d12",
              fontWeight: "bold",
            }}
          >
            {currentBoss.size} · Dinos vaincus : {bossWins}
          </p>

          <div style={{ marginBottom: 8, color: "#713f12", fontWeight: "bold" }}>
            Vie du boss : {bossHealth}/{currentBoss.maxHealth}
          </div>

          <div
            style={{
              width: "100%",
              height: 22,
              background: "#fde68a",
              borderRadius: 999,
              overflow: "hidden",
              border: "2px solid #facc15",
              marginBottom: mode === "boss" ? 12 : 0,
            }}
          >
            <div
              style={{
                width: `${bossHealthPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #7c3aed, #c084fc)",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {mode === "boss" && (
            <>
              <div
                style={{
                  marginBottom: 8,
                  color: "#713f12",
                  fontWeight: "bold",
                  fontSize: isMobile ? 14 : 16,
                }}
              >
                Temps restant : {bossTimer}s · Passes restantes : {passesLeft}/3
              </div>

              <div
                style={{
                  width: "100%",
                  height: 18,
                  background: "#ede9fe",
                  borderRadius: 999,
                  overflow: "hidden",
                  border: "2px solid #c4b5fd",
                }}
              >
                <div
                  style={{
                    width: `${bossTimePercent}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #facc15, #7c3aed)",
                    transition: "width 1s linear",
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          padding: isMobile ? 10 : 20,
        }}
      >
        <div
          style={{
            background: "#faf5ff",
            padding: isMobile ? 16 : 25,
            borderRadius: 24,
            marginBottom: 20,
            border: "2px solid #e9d5ff",
            boxShadow: "0 8px 24px rgba(124,58,237,0.08)",
          }}
        >
          <div style={{ marginBottom: 10, color: "#7e22ce", fontWeight: "bold" }}>
            {mode === "practice" ? "Mode pratique" : "Mode combat de boss"}
          </div>

          <h2
            style={{
              fontSize: isMobile ? 34 : 42,
              color: "#4c1d95",
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            {a} × {b} = ?
          </h2>

          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") checkAnswer();
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            style={{
              fontSize: 16,
              padding: "12px 14px",
              borderRadius: 12,
              border: "2px solid #d8b4fe",
              width: isMobile ? "100%" : 160,
              maxWidth: 220,
              color: "#4c1d95",
              boxSizing: "border-box",
            }}
          />

          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 10,
            }}
          >
            <button
              onClick={checkAnswer}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: "none",
                background: "#7c3aed",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                width: isMobile ? "100%" : "auto",
                minHeight: 48,
              }}
            >
              {mode === "boss" ? "Attaquer" : "Vérifier"}
            </button>

            <button
              onClick={handlePass}
              disabled={mode === "boss" && passesLeft <= 0}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: "2px solid #e9d5ff",
                background:
                  mode === "boss" && passesLeft <= 0 ? "#f3f4f6" : "#ffffff",
                color: mode === "boss" && passesLeft <= 0 ? "#9ca3af" : "#4c1d95",
                cursor:
                  mode === "boss" && passesLeft <= 0 ? "not-allowed" : "pointer",
                fontWeight: "bold",
                width: isMobile ? "100%" : "auto",
                minHeight: 48,
              }}
            >
              Passer
            </button>
          </div>

          {showThinkingPrompt && mode === "practice" && (
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
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(3, minmax(180px, 1fr))",
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
            padding: isMobile ? 16 : 20,
            borderRadius: 24,
            border: "2px solid #e9d5ff",
          }}
        >
          <h3 style={{ color: "#5b21b6", marginTop: 0 }}>
            Empreintes à retravailler
          </h3>

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

      {showBossVictory && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(76, 29, 149, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #fff7cc, #faf5ff)",
              border: "3px solid #fde047",
              borderRadius: 28,
              padding: isMobile ? 22 : 30,
              width: "min(90vw, 420px)",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(91, 33, 182, 0.25)",
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 10 }}>🎉🦖✨</div>

            <h2 style={{ color: "#5b21b6", marginTop: 0, marginBottom: 10 }}>
              Boss battu !
            </h2>

            <p
              style={{
                color: "#713f12",
                fontWeight: "bold",
                fontSize: 20,
                marginBottom: 10,
              }}
            >
              Super ! Tu passes au prochain boss !
            </p>

            <p style={{ color: "#6b21a8", marginBottom: 22 }}>
              {defeatedBossName} a été vaincu. Ton aventure continue.
            </p>

            <button
              onClick={continueAfterBossVictory}
              style={{
                padding: "12px 20px",
                borderRadius: 14,
                border: "none",
                background: "#7c3aed",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: 16,
                minHeight: 48,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Continuer
            </button>
          </div>
        </div>
      )}
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
      <div style={{ color: "#6b21a8", fontSize: 14 }}>{label}</div>
      <strong style={{ fontSize: 24, color: "#4c1d95" }}>{value}</strong>
    </div>
  );
}
