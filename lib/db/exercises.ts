import { getDatabase, generateId } from "./database";
import type { Exercise, MuscleGroup, Equipment, MovementPattern } from "@/types";
import type { SQLiteBindValue } from "expo-sqlite";

// Type for seed data - all required fields that we actually use
interface SeedExercise {
  id: string;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles?: string;
  equipment?: Equipment;
  movement_pattern?: MovementPattern;
  instructions?: string;
}

export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<Exercise>(
    "SELECT * FROM exercises ORDER BY name ASC"
  );
  return results;
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Exercise>(
    "SELECT * FROM exercises WHERE id = ?",
    [id]
  );
  return result || null;
}

export async function getExercisesByMuscle(muscle: MuscleGroup): Promise<Exercise[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<Exercise>(
    "SELECT * FROM exercises WHERE primary_muscle = ? ORDER BY name ASC",
    [muscle]
  );
  return results;
}

export async function getExercisesByEquipment(equipment: Equipment): Promise<Exercise[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<Exercise>(
    "SELECT * FROM exercises WHERE equipment = ? ORDER BY name ASC",
    [equipment]
  );
  return results;
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  const db = await getDatabase();
  const searchTerm = `%${query.toLowerCase()}%`;
  const results = await db.getAllAsync<Exercise>(
    "SELECT * FROM exercises WHERE LOWER(name) LIKE ? ORDER BY name ASC",
    [searchTerm]
  );
  return results;
}

export async function filterExercises(filters: {
  muscle?: MuscleGroup;
  equipment?: Equipment;
  movement?: MovementPattern;
  search?: string;
}): Promise<Exercise[]> {
  const db = await getDatabase();
  let query = "SELECT * FROM exercises WHERE 1=1";
  const params: string[] = [];

  if (filters.muscle) {
    query += " AND primary_muscle = ?";
    params.push(filters.muscle);
  }

  if (filters.equipment) {
    query += " AND equipment = ?";
    params.push(filters.equipment);
  }

  if (filters.movement) {
    query += " AND movement_pattern = ?";
    params.push(filters.movement);
  }

  if (filters.search) {
    query += " AND LOWER(name) LIKE ?";
    params.push(`%${filters.search.toLowerCase()}%`);
  }

  query += " ORDER BY name ASC";

  const results = await db.getAllAsync<Exercise>(query, params);
  return results;
}

export async function createCustomExercise(exercise: Omit<Exercise, "id" | "is_custom" | "created_at">): Promise<Exercise> {
  const db = await getDatabase();
  const id = generateId();

  await db.runAsync(
    `INSERT INTO exercises (id, name, primary_muscle, secondary_muscles, equipment, movement_pattern, instructions, is_custom)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      exercise.name,
      exercise.primary_muscle,
      exercise.secondary_muscles || null,
      exercise.equipment || null,
      exercise.movement_pattern || null,
      exercise.instructions || null,
    ]
  );

  const created = await getExerciseById(id);
  return created!;
}

export async function getExerciseCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM exercises"
  );
  return result?.count || 0;
}

export async function seedExercisesIfNeeded(): Promise<void> {
  const count = await getExerciseCount();
  if (count > 0) return; // Already seeded

  const db = await getDatabase();
  const exercises = getExerciseSeedData();

  // Batch insert for performance
  const batchSize = 50;
  for (let i = 0; i < exercises.length; i += batchSize) {
    const batch = exercises.slice(i, i + batchSize);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values: SQLiteBindValue[] = batch.flatMap((e) => [
      e.id,
      e.name,
      e.primary_muscle,
      e.secondary_muscles ?? null,
      e.equipment ?? null,
      e.movement_pattern ?? null,
      e.instructions ?? null,
    ]);

    await db.runAsync(
      `INSERT INTO exercises (id, name, primary_muscle, secondary_muscles, equipment, movement_pattern, instructions)
       VALUES ${placeholders}`,
      values
    );
  }
}

function getExerciseSeedData(): SeedExercise[] {
  return [
    // CHEST - Barbell
    { id: generateId(), name: "Barbell Bench Press", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "barbell", movement_pattern: "push", instructions: "Lie on bench, grip bar slightly wider than shoulder width, lower to chest, press up" },
    { id: generateId(), name: "Incline Barbell Bench Press", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "barbell", movement_pattern: "push", instructions: "Set bench to 30-45 degrees, press bar from upper chest" },
    { id: generateId(), name: "Decline Barbell Bench Press", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "barbell", movement_pattern: "push", instructions: "Set bench to decline, press bar from lower chest" },
    { id: generateId(), name: "Close Grip Bench Press", primary_muscle: "chest", secondary_muscles: "triceps", equipment: "barbell", movement_pattern: "push", instructions: "Grip bar with hands shoulder width apart, press focusing on triceps" },

    // CHEST - Dumbbell
    { id: generateId(), name: "Dumbbell Bench Press", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "dumbbell", movement_pattern: "push", instructions: "Lie on bench with dumbbells, press up and together" },
    { id: generateId(), name: "Incline Dumbbell Press", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "dumbbell", movement_pattern: "push", instructions: "Set bench to 30-45 degrees, press dumbbells from upper chest" },
    { id: generateId(), name: "Decline Dumbbell Press", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "dumbbell", movement_pattern: "push", instructions: "Set bench to decline, press dumbbells" },
    { id: generateId(), name: "Dumbbell Flyes", primary_muscle: "chest", equipment: "dumbbell", movement_pattern: "push", instructions: "Lie on bench, arms extended, lower dumbbells in arc to sides" },
    { id: generateId(), name: "Incline Dumbbell Flyes", primary_muscle: "chest", equipment: "dumbbell", movement_pattern: "push", instructions: "Set bench to incline, perform flyes targeting upper chest" },
    { id: generateId(), name: "Dumbbell Pullover", primary_muscle: "chest", secondary_muscles: "lats", equipment: "dumbbell", movement_pattern: "pull", instructions: "Lie across bench, lower dumbbell behind head, pull over" },

    // CHEST - Cable
    { id: generateId(), name: "Cable Flyes", primary_muscle: "chest", equipment: "cable", movement_pattern: "push", instructions: "Stand between cables, bring handles together in front of chest" },
    { id: generateId(), name: "Low Cable Flyes", primary_muscle: "chest", equipment: "cable", movement_pattern: "push", instructions: "Set cables low, bring handles up and together" },
    { id: generateId(), name: "High Cable Flyes", primary_muscle: "chest", equipment: "cable", movement_pattern: "push", instructions: "Set cables high, bring handles down and together" },
    { id: generateId(), name: "Cable Crossover", primary_muscle: "chest", equipment: "cable", movement_pattern: "push", instructions: "Stand between cables, cross hands in front of body" },

    // CHEST - Machine
    { id: generateId(), name: "Machine Chest Press", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "machine", movement_pattern: "push", instructions: "Sit in machine, press handles forward" },
    { id: generateId(), name: "Pec Deck Machine", primary_muscle: "chest", equipment: "machine", movement_pattern: "push", instructions: "Sit in machine, bring pads together in front" },
    { id: generateId(), name: "Smith Machine Bench Press", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "machine", movement_pattern: "push", instructions: "Lie on bench under smith machine, press bar" },

    // CHEST - Bodyweight
    { id: generateId(), name: "Push-ups", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "bodyweight", movement_pattern: "push", instructions: "Hands shoulder width apart, lower chest to ground, push up" },
    { id: generateId(), name: "Wide Push-ups", primary_muscle: "chest", secondary_muscles: "shoulders", equipment: "bodyweight", movement_pattern: "push", instructions: "Hands wider than shoulders, perform push-up" },
    { id: generateId(), name: "Diamond Push-ups", primary_muscle: "chest", secondary_muscles: "triceps", equipment: "bodyweight", movement_pattern: "push", instructions: "Hands together forming diamond, perform push-up" },
    { id: generateId(), name: "Incline Push-ups", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "bodyweight", movement_pattern: "push", instructions: "Hands on elevated surface, perform push-up" },
    { id: generateId(), name: "Decline Push-ups", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "bodyweight", movement_pattern: "push", instructions: "Feet on elevated surface, perform push-up" },
    { id: generateId(), name: "Dips (Chest)", primary_muscle: "chest", secondary_muscles: "triceps,shoulders", equipment: "bodyweight", movement_pattern: "push", instructions: "Lean forward on dip bars, lower and press up" },

    // BACK - Barbell
    { id: generateId(), name: "Barbell Row", primary_muscle: "back", secondary_muscles: "biceps", equipment: "barbell", movement_pattern: "pull", instructions: "Bend over, pull bar to lower chest/upper abs" },
    { id: generateId(), name: "Pendlay Row", primary_muscle: "back", secondary_muscles: "biceps", equipment: "barbell", movement_pattern: "pull", instructions: "Strict row from floor, back parallel to ground" },
    { id: generateId(), name: "T-Bar Row", primary_muscle: "back", secondary_muscles: "biceps", equipment: "barbell", movement_pattern: "pull", instructions: "Straddle bar, pull to chest" },
    { id: generateId(), name: "Deadlift", primary_muscle: "back", secondary_muscles: "legs,core", equipment: "barbell", movement_pattern: "hinge", instructions: "Hip hinge, grip bar, stand up keeping back straight" },
    { id: generateId(), name: "Romanian Deadlift", primary_muscle: "back", secondary_muscles: "hamstrings", equipment: "barbell", movement_pattern: "hinge", instructions: "Slight knee bend, hip hinge, lower bar along legs" },
    { id: generateId(), name: "Rack Pull", primary_muscle: "back", secondary_muscles: "legs", equipment: "barbell", movement_pattern: "hinge", instructions: "Start from knee height in rack, perform top portion of deadlift" },

    // BACK - Dumbbell
    { id: generateId(), name: "Dumbbell Row", primary_muscle: "back", secondary_muscles: "biceps", equipment: "dumbbell", movement_pattern: "pull", instructions: "One hand on bench, row dumbbell to hip" },
    { id: generateId(), name: "Chest Supported Row", primary_muscle: "back", secondary_muscles: "biceps", equipment: "dumbbell", movement_pattern: "pull", instructions: "Lie face down on incline bench, row dumbbells" },
    { id: generateId(), name: "Dumbbell Pullover", primary_muscle: "back", secondary_muscles: "chest", equipment: "dumbbell", movement_pattern: "pull", instructions: "Lie across bench, lower dumbbell behind head" },
    { id: generateId(), name: "Dumbbell Shrug", primary_muscle: "back", secondary_muscles: "traps", equipment: "dumbbell", movement_pattern: "pull", instructions: "Hold dumbbells at sides, shrug shoulders up" },
    { id: generateId(), name: "Dumbbell Deadlift", primary_muscle: "back", secondary_muscles: "legs", equipment: "dumbbell", movement_pattern: "hinge", instructions: "Hip hinge holding dumbbells, stand up" },

    // BACK - Cable
    { id: generateId(), name: "Lat Pulldown", primary_muscle: "back", secondary_muscles: "biceps", equipment: "cable", movement_pattern: "pull", instructions: "Grip wide bar, pull down to upper chest" },
    { id: generateId(), name: "Close Grip Lat Pulldown", primary_muscle: "back", secondary_muscles: "biceps", equipment: "cable", movement_pattern: "pull", instructions: "Use close grip handle, pull to chest" },
    { id: generateId(), name: "Straight Arm Pulldown", primary_muscle: "back", equipment: "cable", movement_pattern: "pull", instructions: "Arms straight, pull bar down to thighs" },
    { id: generateId(), name: "Seated Cable Row", primary_muscle: "back", secondary_muscles: "biceps", equipment: "cable", movement_pattern: "pull", instructions: "Sit at cable row, pull handle to stomach" },
    { id: generateId(), name: "Face Pull", primary_muscle: "back", secondary_muscles: "shoulders", equipment: "cable", movement_pattern: "pull", instructions: "Pull rope to face, externally rotating shoulders" },
    { id: generateId(), name: "Cable Shrug", primary_muscle: "back", equipment: "cable", movement_pattern: "pull", instructions: "Stand at cable, shrug shoulders up" },

    // BACK - Machine
    { id: generateId(), name: "Machine Row", primary_muscle: "back", secondary_muscles: "biceps", equipment: "machine", movement_pattern: "pull", instructions: "Sit in row machine, pull handles to chest" },
    { id: generateId(), name: "Assisted Pull-up Machine", primary_muscle: "back", secondary_muscles: "biceps", equipment: "machine", movement_pattern: "pull", instructions: "Kneel on pad, perform assisted pull-ups" },

    // BACK - Bodyweight
    { id: generateId(), name: "Pull-ups", primary_muscle: "back", secondary_muscles: "biceps", equipment: "bodyweight", movement_pattern: "pull", instructions: "Hang from bar, pull chin over bar" },
    { id: generateId(), name: "Chin-ups", primary_muscle: "back", secondary_muscles: "biceps", equipment: "bodyweight", movement_pattern: "pull", instructions: "Underhand grip, pull chin over bar" },
    { id: generateId(), name: "Wide Grip Pull-ups", primary_muscle: "back", secondary_muscles: "biceps", equipment: "bodyweight", movement_pattern: "pull", instructions: "Wide overhand grip, pull up" },
    { id: generateId(), name: "Inverted Row", primary_muscle: "back", secondary_muscles: "biceps", equipment: "bodyweight", movement_pattern: "pull", instructions: "Hang under bar, pull chest to bar" },
    { id: generateId(), name: "Superman", primary_muscle: "back", equipment: "bodyweight", movement_pattern: "hinge", instructions: "Lie face down, lift arms and legs off ground" },

    // SHOULDERS - Barbell
    { id: generateId(), name: "Overhead Press", primary_muscle: "shoulders", secondary_muscles: "triceps", equipment: "barbell", movement_pattern: "push", instructions: "Press bar from shoulders to overhead" },
    { id: generateId(), name: "Push Press", primary_muscle: "shoulders", secondary_muscles: "triceps,legs", equipment: "barbell", movement_pattern: "push", instructions: "Use leg drive to press bar overhead" },
    { id: generateId(), name: "Behind Neck Press", primary_muscle: "shoulders", secondary_muscles: "triceps", equipment: "barbell", movement_pattern: "push", instructions: "Press from behind neck to overhead" },
    { id: generateId(), name: "Barbell Front Raise", primary_muscle: "shoulders", equipment: "barbell", movement_pattern: "push", instructions: "Raise bar in front to shoulder height" },
    { id: generateId(), name: "Upright Row", primary_muscle: "shoulders", secondary_muscles: "traps", equipment: "barbell", movement_pattern: "pull", instructions: "Pull bar up along body to chin" },
    { id: generateId(), name: "Barbell Shrug", primary_muscle: "shoulders", secondary_muscles: "traps", equipment: "barbell", movement_pattern: "pull", instructions: "Hold bar at thighs, shrug shoulders up" },

    // SHOULDERS - Dumbbell
    { id: generateId(), name: "Dumbbell Shoulder Press", primary_muscle: "shoulders", secondary_muscles: "triceps", equipment: "dumbbell", movement_pattern: "push", instructions: "Press dumbbells from shoulders to overhead" },
    { id: generateId(), name: "Arnold Press", primary_muscle: "shoulders", secondary_muscles: "triceps", equipment: "dumbbell", movement_pattern: "push", instructions: "Rotate dumbbells while pressing overhead" },
    { id: generateId(), name: "Lateral Raise", primary_muscle: "shoulders", equipment: "dumbbell", movement_pattern: "push", instructions: "Raise dumbbells to sides at shoulder height" },
    { id: generateId(), name: "Front Raise", primary_muscle: "shoulders", equipment: "dumbbell", movement_pattern: "push", instructions: "Raise dumbbells in front to shoulder height" },
    { id: generateId(), name: "Rear Delt Fly", primary_muscle: "shoulders", equipment: "dumbbell", movement_pattern: "pull", instructions: "Bend over, raise dumbbells to sides" },
    { id: generateId(), name: "Dumbbell Upright Row", primary_muscle: "shoulders", secondary_muscles: "traps", equipment: "dumbbell", movement_pattern: "pull", instructions: "Pull dumbbells up along body" },

    // SHOULDERS - Cable
    { id: generateId(), name: "Cable Lateral Raise", primary_muscle: "shoulders", equipment: "cable", movement_pattern: "push", instructions: "Single arm lateral raise with cable" },
    { id: generateId(), name: "Cable Front Raise", primary_muscle: "shoulders", equipment: "cable", movement_pattern: "push", instructions: "Raise cable handle in front" },
    { id: generateId(), name: "Cable Rear Delt Fly", primary_muscle: "shoulders", equipment: "cable", movement_pattern: "pull", instructions: "Cross cables, pull apart targeting rear delts" },
    { id: generateId(), name: "Cable Upright Row", primary_muscle: "shoulders", equipment: "cable", movement_pattern: "pull", instructions: "Pull cable bar up to chin" },

    // SHOULDERS - Machine
    { id: generateId(), name: "Machine Shoulder Press", primary_muscle: "shoulders", secondary_muscles: "triceps", equipment: "machine", movement_pattern: "push", instructions: "Sit in machine, press handles overhead" },
    { id: generateId(), name: "Machine Lateral Raise", primary_muscle: "shoulders", equipment: "machine", movement_pattern: "push", instructions: "Sit in machine, raise arms to sides" },
    { id: generateId(), name: "Reverse Pec Deck", primary_muscle: "shoulders", equipment: "machine", movement_pattern: "pull", instructions: "Face pec deck machine, pull handles back" },

    // SHOULDERS - Bodyweight
    { id: generateId(), name: "Pike Push-ups", primary_muscle: "shoulders", secondary_muscles: "triceps", equipment: "bodyweight", movement_pattern: "push", instructions: "Pike position, lower head toward ground" },
    { id: generateId(), name: "Handstand Push-ups", primary_muscle: "shoulders", secondary_muscles: "triceps", equipment: "bodyweight", movement_pattern: "push", instructions: "Handstand against wall, lower and press" },

    // BICEPS - Barbell
    { id: generateId(), name: "Barbell Curl", primary_muscle: "biceps", equipment: "barbell", movement_pattern: "pull", instructions: "Curl bar from thighs to shoulders" },
    { id: generateId(), name: "EZ Bar Curl", primary_muscle: "biceps", equipment: "barbell", movement_pattern: "pull", instructions: "Curl EZ bar with angled grip" },
    { id: generateId(), name: "Preacher Curl", primary_muscle: "biceps", equipment: "barbell", movement_pattern: "pull", instructions: "Arms on preacher bench, curl bar" },
    { id: generateId(), name: "Reverse Curl", primary_muscle: "biceps", secondary_muscles: "forearms", equipment: "barbell", movement_pattern: "pull", instructions: "Overhand grip, curl bar up" },
    { id: generateId(), name: "Drag Curl", primary_muscle: "biceps", equipment: "barbell", movement_pattern: "pull", instructions: "Curl bar while keeping it close to body" },

    // BICEPS - Dumbbell
    { id: generateId(), name: "Dumbbell Curl", primary_muscle: "biceps", equipment: "dumbbell", movement_pattern: "pull", instructions: "Curl dumbbells from sides to shoulders" },
    { id: generateId(), name: "Hammer Curl", primary_muscle: "biceps", secondary_muscles: "forearms", equipment: "dumbbell", movement_pattern: "pull", instructions: "Neutral grip, curl dumbbells up" },
    { id: generateId(), name: "Incline Dumbbell Curl", primary_muscle: "biceps", equipment: "dumbbell", movement_pattern: "pull", instructions: "Lie on incline bench, curl dumbbells" },
    { id: generateId(), name: "Concentration Curl", primary_muscle: "biceps", equipment: "dumbbell", movement_pattern: "pull", instructions: "Elbow on inner thigh, curl single dumbbell" },
    { id: generateId(), name: "Zottman Curl", primary_muscle: "biceps", secondary_muscles: "forearms", equipment: "dumbbell", movement_pattern: "pull", instructions: "Curl up supinated, lower pronated" },
    { id: generateId(), name: "Spider Curl", primary_muscle: "biceps", equipment: "dumbbell", movement_pattern: "pull", instructions: "Lie face down on incline, curl dumbbells" },

    // BICEPS - Cable
    { id: generateId(), name: "Cable Curl", primary_muscle: "biceps", equipment: "cable", movement_pattern: "pull", instructions: "Stand at cable, curl bar up" },
    { id: generateId(), name: "Cable Hammer Curl", primary_muscle: "biceps", equipment: "cable", movement_pattern: "pull", instructions: "Use rope attachment, curl with neutral grip" },
    { id: generateId(), name: "High Cable Curl", primary_muscle: "biceps", equipment: "cable", movement_pattern: "pull", instructions: "Cables at head height, curl toward head" },
    { id: generateId(), name: "Cable Preacher Curl", primary_muscle: "biceps", equipment: "cable", movement_pattern: "pull", instructions: "Use preacher bench with cable" },

    // BICEPS - Machine
    { id: generateId(), name: "Machine Curl", primary_muscle: "biceps", equipment: "machine", movement_pattern: "pull", instructions: "Sit in curl machine, curl handles up" },
    { id: generateId(), name: "Machine Preacher Curl", primary_muscle: "biceps", equipment: "machine", movement_pattern: "pull", instructions: "Use machine preacher curl station" },

    // TRICEPS - Barbell
    { id: generateId(), name: "Skull Crushers", primary_muscle: "triceps", equipment: "barbell", movement_pattern: "push", instructions: "Lie on bench, lower bar to forehead, extend" },
    { id: generateId(), name: "Close Grip Bench Press", primary_muscle: "triceps", secondary_muscles: "chest", equipment: "barbell", movement_pattern: "push", instructions: "Narrow grip bench press focusing on triceps" },
    { id: generateId(), name: "Overhead Tricep Extension", primary_muscle: "triceps", equipment: "barbell", movement_pattern: "push", instructions: "Hold bar overhead, lower behind head, extend" },

    // TRICEPS - Dumbbell
    { id: generateId(), name: "Dumbbell Tricep Extension", primary_muscle: "triceps", equipment: "dumbbell", movement_pattern: "push", instructions: "Single dumbbell overhead, lower behind head" },
    { id: generateId(), name: "Dumbbell Kickback", primary_muscle: "triceps", equipment: "dumbbell", movement_pattern: "push", instructions: "Bend over, extend arm behind" },
    { id: generateId(), name: "Lying Tricep Extension", primary_muscle: "triceps", equipment: "dumbbell", movement_pattern: "push", instructions: "Lie on bench, extend dumbbells from behind head" },

    // TRICEPS - Cable
    { id: generateId(), name: "Tricep Pushdown", primary_muscle: "triceps", equipment: "cable", movement_pattern: "push", instructions: "Push cable bar down, keeping elbows at sides" },
    { id: generateId(), name: "Rope Pushdown", primary_muscle: "triceps", equipment: "cable", movement_pattern: "push", instructions: "Push rope down and apart at bottom" },
    { id: generateId(), name: "Overhead Cable Extension", primary_muscle: "triceps", equipment: "cable", movement_pattern: "push", instructions: "Face away from cable, extend overhead" },
    { id: generateId(), name: "Single Arm Pushdown", primary_muscle: "triceps", equipment: "cable", movement_pattern: "push", instructions: "Single arm cable pushdown" },

    // TRICEPS - Bodyweight
    { id: generateId(), name: "Dips (Triceps)", primary_muscle: "triceps", secondary_muscles: "chest,shoulders", equipment: "bodyweight", movement_pattern: "push", instructions: "Keep body upright on dip bars" },
    { id: generateId(), name: "Bench Dips", primary_muscle: "triceps", equipment: "bodyweight", movement_pattern: "push", instructions: "Hands on bench behind, lower and press" },
    { id: generateId(), name: "Close Grip Push-ups", primary_muscle: "triceps", secondary_muscles: "chest", equipment: "bodyweight", movement_pattern: "push", instructions: "Hands close together, push up" },

    // LEGS - Barbell
    { id: generateId(), name: "Back Squat", primary_muscle: "legs", secondary_muscles: "core", equipment: "barbell", movement_pattern: "squat", instructions: "Bar on upper back, squat down and up" },
    { id: generateId(), name: "Front Squat", primary_muscle: "legs", secondary_muscles: "core", equipment: "barbell", movement_pattern: "squat", instructions: "Bar on front shoulders, squat down" },
    { id: generateId(), name: "Romanian Deadlift", primary_muscle: "legs", secondary_muscles: "back", equipment: "barbell", movement_pattern: "hinge", instructions: "Hip hinge, lower bar along legs" },
    { id: generateId(), name: "Stiff Leg Deadlift", primary_muscle: "legs", secondary_muscles: "back", equipment: "barbell", movement_pattern: "hinge", instructions: "Legs straight, hip hinge with bar" },
    { id: generateId(), name: "Barbell Lunge", primary_muscle: "legs", equipment: "barbell", movement_pattern: "squat", instructions: "Bar on back, step forward into lunge" },
    { id: generateId(), name: "Barbell Hip Thrust", primary_muscle: "legs", equipment: "barbell", movement_pattern: "hinge", instructions: "Back on bench, thrust hips up with bar" },
    { id: generateId(), name: "Good Morning", primary_muscle: "legs", secondary_muscles: "back", equipment: "barbell", movement_pattern: "hinge", instructions: "Bar on back, hip hinge forward" },
    { id: generateId(), name: "Sumo Deadlift", primary_muscle: "legs", secondary_muscles: "back", equipment: "barbell", movement_pattern: "hinge", instructions: "Wide stance, grip inside legs, stand up" },
    { id: generateId(), name: "Barbell Calf Raise", primary_muscle: "legs", equipment: "barbell", movement_pattern: "push", instructions: "Bar on back, raise up on toes" },

    // LEGS - Dumbbell
    { id: generateId(), name: "Goblet Squat", primary_muscle: "legs", secondary_muscles: "core", equipment: "dumbbell", movement_pattern: "squat", instructions: "Hold dumbbell at chest, squat down" },
    { id: generateId(), name: "Dumbbell Lunge", primary_muscle: "legs", equipment: "dumbbell", movement_pattern: "squat", instructions: "Hold dumbbells at sides, lunge forward" },
    { id: generateId(), name: "Walking Lunge", primary_muscle: "legs", equipment: "dumbbell", movement_pattern: "squat", instructions: "Lunge forward alternating legs while walking" },
    { id: generateId(), name: "Bulgarian Split Squat", primary_muscle: "legs", equipment: "dumbbell", movement_pattern: "squat", instructions: "Rear foot elevated, squat down on front leg" },
    { id: generateId(), name: "Dumbbell Step Up", primary_muscle: "legs", equipment: "dumbbell", movement_pattern: "squat", instructions: "Step up onto box holding dumbbells" },
    { id: generateId(), name: "Dumbbell Romanian Deadlift", primary_muscle: "legs", secondary_muscles: "back", equipment: "dumbbell", movement_pattern: "hinge", instructions: "Hip hinge holding dumbbells" },
    { id: generateId(), name: "Single Leg RDL", primary_muscle: "legs", secondary_muscles: "back", equipment: "dumbbell", movement_pattern: "hinge", instructions: "Single leg hip hinge with dumbbell" },
    { id: generateId(), name: "Dumbbell Calf Raise", primary_muscle: "legs", equipment: "dumbbell", movement_pattern: "push", instructions: "Hold dumbbells, raise up on toes" },

    // LEGS - Machine
    { id: generateId(), name: "Leg Press", primary_muscle: "legs", equipment: "machine", movement_pattern: "squat", instructions: "Push platform away with legs" },
    { id: generateId(), name: "Hack Squat", primary_muscle: "legs", equipment: "machine", movement_pattern: "squat", instructions: "Squat in hack squat machine" },
    { id: generateId(), name: "Leg Extension", primary_muscle: "legs", equipment: "machine", movement_pattern: "push", instructions: "Extend legs against pad" },
    { id: generateId(), name: "Leg Curl", primary_muscle: "legs", equipment: "machine", movement_pattern: "pull", instructions: "Curl legs against pad" },
    { id: generateId(), name: "Seated Leg Curl", primary_muscle: "legs", equipment: "machine", movement_pattern: "pull", instructions: "Seated, curl legs under pad" },
    { id: generateId(), name: "Hip Adductor Machine", primary_muscle: "legs", equipment: "machine", movement_pattern: "push", instructions: "Squeeze legs together against pads" },
    { id: generateId(), name: "Hip Abductor Machine", primary_muscle: "legs", equipment: "machine", movement_pattern: "push", instructions: "Push legs apart against pads" },
    { id: generateId(), name: "Glute Kickback Machine", primary_muscle: "legs", equipment: "machine", movement_pattern: "hinge", instructions: "Kick leg back against pad" },
    { id: generateId(), name: "Calf Raise Machine", primary_muscle: "legs", equipment: "machine", movement_pattern: "push", instructions: "Raise up on toes in calf raise machine" },
    { id: generateId(), name: "Seated Calf Raise", primary_muscle: "legs", equipment: "machine", movement_pattern: "push", instructions: "Seated, raise heels against resistance" },
    { id: generateId(), name: "Smith Machine Squat", primary_muscle: "legs", equipment: "machine", movement_pattern: "squat", instructions: "Squat in smith machine" },

    // LEGS - Bodyweight
    { id: generateId(), name: "Bodyweight Squat", primary_muscle: "legs", equipment: "bodyweight", movement_pattern: "squat", instructions: "Squat down with no weight" },
    { id: generateId(), name: "Jump Squat", primary_muscle: "legs", equipment: "bodyweight", movement_pattern: "squat", instructions: "Squat then jump explosively" },
    { id: generateId(), name: "Pistol Squat", primary_muscle: "legs", equipment: "bodyweight", movement_pattern: "squat", instructions: "Single leg squat, other leg extended" },
    { id: generateId(), name: "Wall Sit", primary_muscle: "legs", equipment: "bodyweight", movement_pattern: "squat", instructions: "Back against wall, hold squat position" },
    { id: generateId(), name: "Glute Bridge", primary_muscle: "legs", equipment: "bodyweight", movement_pattern: "hinge", instructions: "Lie on back, thrust hips up" },
    { id: generateId(), name: "Single Leg Glute Bridge", primary_muscle: "legs", equipment: "bodyweight", movement_pattern: "hinge", instructions: "Single leg hip thrust" },
    { id: generateId(), name: "Reverse Lunge", primary_muscle: "legs", equipment: "bodyweight", movement_pattern: "squat", instructions: "Step backward into lunge" },
    { id: generateId(), name: "Box Jump", primary_muscle: "legs", equipment: "bodyweight", movement_pattern: "squat", instructions: "Jump up onto box" },
    { id: generateId(), name: "Calf Raise", primary_muscle: "legs", equipment: "bodyweight", movement_pattern: "push", instructions: "Rise up on toes" },

    // CORE
    { id: generateId(), name: "Plank", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "carry", instructions: "Hold body in straight line on forearms" },
    { id: generateId(), name: "Side Plank", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "carry", instructions: "Hold body sideways on one forearm" },
    { id: generateId(), name: "Crunches", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Lie on back, crunch shoulders toward hips" },
    { id: generateId(), name: "Bicycle Crunches", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Alternate elbow to opposite knee" },
    { id: generateId(), name: "Leg Raise", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Lie on back, raise legs to vertical" },
    { id: generateId(), name: "Hanging Leg Raise", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Hang from bar, raise legs" },
    { id: generateId(), name: "Knee Raise", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Hang from bar, raise knees to chest" },
    { id: generateId(), name: "Russian Twist", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Seated, twist torso side to side" },
    { id: generateId(), name: "Mountain Climbers", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Plank position, alternate driving knees forward" },
    { id: generateId(), name: "Dead Bug", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "carry", instructions: "Lie on back, alternate extending opposite arm and leg" },
    { id: generateId(), name: "Bird Dog", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "carry", instructions: "On all fours, extend opposite arm and leg" },
    { id: generateId(), name: "Ab Wheel Rollout", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Roll ab wheel forward and back" },
    { id: generateId(), name: "V-Up", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Lie flat, raise torso and legs to V shape" },
    { id: generateId(), name: "Toe Touch", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Legs vertical, reach up to touch toes" },
    { id: generateId(), name: "Flutter Kicks", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Lie on back, alternate kicking legs" },
    { id: generateId(), name: "Cable Crunch", primary_muscle: "core", equipment: "cable", movement_pattern: "pull", instructions: "Kneel at cable, crunch down" },
    { id: generateId(), name: "Cable Woodchop", primary_muscle: "core", equipment: "cable", movement_pattern: "pull", instructions: "Rotate torso pulling cable diagonally" },
    { id: generateId(), name: "Pallof Press", primary_muscle: "core", equipment: "cable", movement_pattern: "carry", instructions: "Stand sideways to cable, press handle forward" },
    { id: generateId(), name: "Weighted Plank", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "carry", instructions: "Hold plank with weight plate on back" },
    { id: generateId(), name: "Decline Sit-up", primary_muscle: "core", equipment: "bodyweight", movement_pattern: "pull", instructions: "Feet hooked on decline bench, sit up" },

    // FOREARMS
    { id: generateId(), name: "Wrist Curl", primary_muscle: "forearms", equipment: "dumbbell", movement_pattern: "pull", instructions: "Forearms on bench, curl wrists up" },
    { id: generateId(), name: "Reverse Wrist Curl", primary_muscle: "forearms", equipment: "dumbbell", movement_pattern: "pull", instructions: "Forearms on bench, extend wrists up" },
    { id: generateId(), name: "Farmer's Walk", primary_muscle: "forearms", secondary_muscles: "core,legs", equipment: "dumbbell", movement_pattern: "carry", instructions: "Hold heavy dumbbells, walk" },
    { id: generateId(), name: "Dead Hang", primary_muscle: "forearms", equipment: "bodyweight", movement_pattern: "carry", instructions: "Hang from bar as long as possible" },
    { id: generateId(), name: "Plate Pinch", primary_muscle: "forearms", equipment: "bodyweight", movement_pattern: "carry", instructions: "Pinch weight plates between fingers" },
  ];
}
