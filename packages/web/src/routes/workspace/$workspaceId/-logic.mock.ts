import type {
  DropdownBlock,
  GaugeBlock,
  HeadingBlock,
  ListBlock,
  LoaderBlock,
  MultipleChoiceBlock,
  Page,
  ParagraphBlock,
  PictureChoiceBlock,
  Rule,
  SpacerBlock,
  TextInputBlock,
  Theme,
} from '@shopfunnel/core/quiz/types'

// ============================================
// Theme
// ============================================

export const mockTheme: Theme = {
  colors: {
    primary: '#6366f1',
    primaryForeground: '#ffffff',
    background: '#ffffff',
    foreground: '#0a0a0a',
  },
  radius: { name: 'medium', value: '0.625rem' },
}

// ============================================
// Pages 1-8: Welcome + Weight Loss Path
// ============================================

// Page 1: Welcome
const page1: Page = {
  id: 'page-1',
  name: 'Welcome',
  blocks: [
    {
      id: 'block-1-1',
      type: 'heading',
      properties: { text: 'Transform Your Life Today', alignment: 'center' },
    } satisfies HeadingBlock,
    {
      id: 'block-1-2',
      type: 'paragraph',
      properties: {
        text: 'Take this personalized assessment to discover the perfect fitness and wellness plan tailored just for you. Answer honestly for the best results!',
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-1-3',
      type: 'spacer',
      properties: { size: 'md' },
    } satisfies SpacerBlock,
    {
      id: 'block-1-4',
      type: 'list',
      properties: {
        orientation: 'vertical',
        textPlacement: 'right',
        size: 'sm',
        items: [
          {
            id: 'li-1-1',
            title: 'Personalized Plan',
            subtitle: 'Based on your goals',
            media: { type: 'emoji', value: '🎯' },
          },
          {
            id: 'li-1-2',
            title: 'Expert Guidance',
            subtitle: 'Science-backed approach',
            media: { type: 'emoji', value: '🔬' },
          },
          {
            id: 'li-1-3',
            title: 'Track Progress',
            subtitle: 'See real results',
            media: { type: 'emoji', value: '📈' },
          },
        ],
      },
    } satisfies ListBlock,
  ],
  properties: { buttonText: 'Get Started' },
}

// Page 2: Name Input
const page2: Page = {
  id: 'page-2',
  name: 'Your Name',
  blocks: [
    {
      id: 'block-2-1',
      type: 'heading',
      properties: { text: "What's your name?", alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-2-2',
      type: 'paragraph',
      properties: {
        text: "We'll use this to personalize your experience.",
        alignment: 'left',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-2-3',
      type: 'text_input',
      properties: {
        name: 'user_name',
        placeholder: 'Enter your first name',
      },
      validations: { required: true, minLength: 2, maxLength: 50 },
    } satisfies TextInputBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 3: Age Group
const page3: Page = {
  id: 'page-3',
  name: 'Age Group',
  blocks: [
    {
      id: 'block-3-1',
      type: 'heading',
      properties: { text: 'What is your age range?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-3-2',
      type: 'paragraph',
      properties: {
        text: 'This helps us tailor recommendations to your life stage.',
        alignment: 'left',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-3-3',
      type: 'dropdown',
      properties: {
        name: 'age_group',
        placeholder: 'Select your age range',
        options: [
          { id: 'age-18-24', label: '18-24 years' },
          { id: 'age-25-34', label: '25-34 years' },
          { id: 'age-35-44', label: '35-44 years' },
          { id: 'age-45-54', label: '45-54 years' },
          { id: 'age-55-64', label: '55-64 years' },
          { id: 'age-65+', label: '65+ years' },
        ],
      },
      validations: { required: true },
    } satisfies DropdownBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 4: Main Goal (MAJOR BRANCH POINT)
const page4: Page = {
  id: 'page-4',
  name: 'Primary Goal',
  blocks: [
    {
      id: 'block-4-1',
      type: 'heading',
      properties: { text: 'What is your primary goal?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-4-2',
      type: 'multiple_choice',
      properties: {
        name: 'primary_goal',
        multiple: false,
        options: [
          {
            id: 'goal-weight-loss',
            label: 'Lose Weight',
            description: 'Shed pounds and feel lighter',
            media: { type: 'emoji', value: '🏃' },
          },
          {
            id: 'goal-muscle',
            label: 'Build Muscle',
            description: 'Get stronger and more defined',
            media: { type: 'emoji', value: '💪' },
          },
          {
            id: 'goal-health',
            label: 'Improve Health',
            description: 'Feel better overall',
            media: { type: 'emoji', value: '❤️' },
          },
        ],
      },
      validations: { required: true },
    } satisfies MultipleChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 5: Weight Loss - Diet Type (Branch Point)
const page5: Page = {
  id: 'page-5',
  name: 'Diet Preference',
  blocks: [
    {
      id: 'block-5-1',
      type: 'heading',
      properties: { text: 'What diet approach interests you?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-5-2',
      type: 'paragraph',
      properties: {
        text: 'Choose the eating style that best fits your lifestyle and preferences.',
        alignment: 'left',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-5-3',
      type: 'picture_choice',
      properties: {
        name: 'diet_type',
        multiple: false,
        options: [
          { id: 'diet-keto', label: 'Keto / Low Carb', description: 'High fat, very low carbohydrates' },
          {
            id: 'diet-balanced',
            label: 'Balanced / Calorie Counting',
            description: 'Flexible approach with portion control',
          },
          { id: 'diet-plant', label: 'Plant-Based', description: 'Vegetarian or vegan focused' },
          { id: 'diet-mediterranean', label: 'Mediterranean', description: 'Heart-healthy whole foods' },
        ],
      },
      validations: { required: true },
    } satisfies PictureChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 6: Keto Branch - Carb Tolerance
const page6: Page = {
  id: 'page-6',
  name: 'Keto Details',
  blocks: [
    {
      id: 'block-6-1',
      type: 'heading',
      properties: { text: 'How strict do you want to go?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-6-2',
      type: 'paragraph',
      properties: {
        text: 'Keto can range from strict (<20g carbs) to more relaxed low-carb approaches.',
        alignment: 'left',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-6-3',
      type: 'multiple_choice',
      properties: {
        name: 'keto_strictness',
        multiple: false,
        options: [
          {
            id: 'keto-strict',
            label: 'Strict Keto',
            description: 'Under 20g net carbs daily',
            media: { type: 'emoji', value: '🥩' },
          },
          {
            id: 'keto-moderate',
            label: 'Moderate Low-Carb',
            description: '20-50g net carbs daily',
            media: { type: 'emoji', value: '🥑' },
          },
          {
            id: 'keto-lazy',
            label: 'Lazy Keto',
            description: 'Just avoid obvious carbs',
            media: { type: 'emoji', value: '🧀' },
          },
        ],
      },
      validations: { required: true },
    } satisfies MultipleChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 7: Calorie Counting Branch
const page7: Page = {
  id: 'page-7',
  name: 'Calorie Approach',
  blocks: [
    {
      id: 'block-7-1',
      type: 'heading',
      properties: { text: 'How do you prefer to track?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-7-2',
      type: 'multiple_choice',
      properties: {
        name: 'tracking_preference',
        multiple: false,
        options: [
          {
            id: 'track-strict',
            label: 'Track Everything',
            description: 'Log every meal and snack',
            media: { type: 'emoji', value: '📱' },
          },
          {
            id: 'track-meals',
            label: 'Track Meals Only',
            description: 'Focus on main meals',
            media: { type: 'emoji', value: '🍽️' },
          },
          {
            id: 'track-intuitive',
            label: 'Intuitive + Weekly Check-ins',
            description: 'Mindful eating with periodic tracking',
            media: { type: 'emoji', value: '🧘' },
          },
        ],
      },
      validations: { required: true },
    } satisfies MultipleChoiceBlock,
    {
      id: 'block-7-3',
      type: 'spacer',
      properties: { size: 'sm' },
    } satisfies SpacerBlock,
    {
      id: 'block-7-4',
      type: 'paragraph',
      properties: {
        text: 'Research shows that tracking food intake increases weight loss success by 2-3x.',
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 8: Activity Level (Weight Loss Path)
const page8: Page = {
  id: 'page-8',
  name: 'Activity Level',
  blocks: [
    {
      id: 'block-8-1',
      type: 'heading',
      properties: { text: 'What is your current activity level?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-8-2',
      type: 'multiple_choice',
      properties: {
        name: 'activity_level',
        multiple: false,
        options: [
          {
            id: 'activity-sedentary',
            label: 'Sedentary',
            description: 'Little to no exercise',
            media: { type: 'emoji', value: '🛋️' },
          },
          {
            id: 'activity-light',
            label: 'Lightly Active',
            description: '1-2 days/week',
            media: { type: 'emoji', value: '🚶' },
          },
          {
            id: 'activity-moderate',
            label: 'Moderately Active',
            description: '3-4 days/week',
            media: { type: 'emoji', value: '🏃' },
          },
          {
            id: 'activity-very',
            label: 'Very Active',
            description: '5+ days/week',
            media: { type: 'emoji', value: '🏋️' },
          },
        ],
      },
      validations: { required: true },
    } satisfies MultipleChoiceBlock,
    {
      id: 'block-8-3',
      type: 'spacer',
      properties: { size: 'md' },
    } satisfies SpacerBlock,
    {
      id: 'block-8-4',
      type: 'gauge',
      properties: {
        value: 35,
        tooltipLabel: 'Average activity',
        marks: ['Sedentary', 'Light', 'Moderate', 'Very Active'],
        minValue: 0,
        maxValue: 100,
      },
    } satisfies GaugeBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// ============================================
// Pages 9-12: Muscle Building Path
// ============================================

// Page 9: Training Type
const page9: Page = {
  id: 'page-9',
  name: 'Training Style',
  blocks: [
    {
      id: 'block-9-1',
      type: 'heading',
      properties: { text: 'What type of training interests you?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-9-2',
      type: 'picture_choice',
      properties: {
        name: 'training_type',
        multiple: false,
        options: [
          { id: 'train-weights', label: 'Weightlifting', description: 'Barbells, dumbbells, machines' },
          { id: 'train-calisthenics', label: 'Calisthenics', description: 'Bodyweight mastery' },
          { id: 'train-crossfit', label: 'CrossFit / HIIT', description: 'High-intensity functional training' },
          { id: 'train-hybrid', label: 'Hybrid Approach', description: 'Mix of everything' },
        ],
      },
      validations: { required: true },
    } satisfies PictureChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 10: Equipment Access (Branch Point)
const page10: Page = {
  id: 'page-10',
  name: 'Equipment Access',
  blocks: [
    {
      id: 'block-10-1',
      type: 'heading',
      properties: { text: 'Where will you train?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-10-2',
      type: 'multiple_choice',
      properties: {
        name: 'equipment_access',
        multiple: false,
        options: [
          {
            id: 'equip-gym',
            label: 'Full Gym Access',
            description: 'Commercial or well-equipped home gym',
            media: { type: 'emoji', value: '🏢' },
          },
          {
            id: 'equip-home-basic',
            label: 'Home - Basic Equipment',
            description: 'Dumbbells, bands, maybe a bench',
            media: { type: 'emoji', value: '🏠' },
          },
          {
            id: 'equip-home-none',
            label: 'Home - No Equipment',
            description: 'Bodyweight only',
            media: { type: 'emoji', value: '🧘' },
          },
        ],
      },
      validations: { required: true },
    } satisfies MultipleChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 11: Gym Program Details
const page11: Page = {
  id: 'page-11',
  name: 'Gym Program',
  blocks: [
    {
      id: 'block-11-1',
      type: 'heading',
      properties: { text: 'Your Gym Training Split', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-11-2',
      type: 'paragraph',
      properties: {
        text: 'With full gym access, you can follow an optimized split routine for maximum gains.',
        alignment: 'left',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-11-3',
      type: 'multiple_choice',
      properties: {
        name: 'gym_split',
        multiple: false,
        options: [
          {
            id: 'split-ppl',
            label: 'Push/Pull/Legs',
            description: '6 days per week',
            media: { type: 'emoji', value: '💪' },
          },
          {
            id: 'split-upper-lower',
            label: 'Upper/Lower',
            description: '4 days per week',
            media: { type: 'emoji', value: '🏋️' },
          },
          {
            id: 'split-full-body',
            label: 'Full Body',
            description: '3 days per week',
            media: { type: 'emoji', value: '🔄' },
          },
          {
            id: 'split-bro',
            label: 'Bro Split',
            description: '5 days, one muscle group per day',
            media: { type: 'emoji', value: '😎' },
          },
        ],
      },
      validations: { required: true },
    } satisfies MultipleChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 12: Home Program Details
const page12: Page = {
  id: 'page-12',
  name: 'Home Program',
  blocks: [
    {
      id: 'block-12-1',
      type: 'heading',
      properties: { text: 'Your Home Training Plan', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-12-2',
      type: 'paragraph',
      properties: {
        text: "You can build serious muscle at home with the right approach. Here's what we recommend:",
        alignment: 'left',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-12-3',
      type: 'list',
      properties: {
        orientation: 'vertical',
        textPlacement: 'right',
        size: 'lg',
        items: [
          {
            id: 'home-1',
            title: 'Progressive Calisthenics',
            subtitle: 'Master bodyweight movements',
            media: { type: 'emoji', value: '🤸' },
          },
          {
            id: 'home-2',
            title: 'Resistance Bands',
            subtitle: 'Affordable and effective',
            media: { type: 'emoji', value: '🎗️' },
          },
          {
            id: 'home-3',
            title: 'Tempo Training',
            subtitle: 'Maximize time under tension',
            media: { type: 'emoji', value: '⏱️' },
          },
        ],
      },
    } satisfies ListBlock,
    {
      id: 'block-12-4',
      type: 'multiple_choice',
      properties: {
        name: 'home_frequency',
        multiple: false,
        options: [
          { id: 'freq-3', label: '3 days/week' },
          { id: 'freq-4', label: '4 days/week' },
          { id: 'freq-5', label: '5+ days/week' },
        ],
      },
      validations: { required: true },
    } satisfies MultipleChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// ============================================
// Pages 13-17: Health Focus Path
// ============================================

// Page 13: Focus Area (Branch Point)
const page13: Page = {
  id: 'page-13',
  name: 'Health Focus',
  blocks: [
    {
      id: 'block-13-1',
      type: 'heading',
      properties: { text: 'What aspect of health matters most?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-13-2',
      type: 'dropdown',
      properties: {
        name: 'health_focus',
        placeholder: 'Select your primary focus',
        options: [
          { id: 'focus-sleep', label: 'Better Sleep' },
          { id: 'focus-mental', label: 'Mental Wellness & Stress' },
          { id: 'focus-energy', label: 'More Energy' },
          { id: 'focus-heart', label: 'Heart Health' },
          { id: 'focus-longevity', label: 'Longevity & Anti-Aging' },
        ],
      },
      validations: { required: true },
    } satisfies DropdownBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 14: Sleep Issues
const page14: Page = {
  id: 'page-14',
  name: 'Sleep Assessment',
  blocks: [
    {
      id: 'block-14-1',
      type: 'heading',
      properties: { text: "What's your biggest sleep challenge?", alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-14-2',
      type: 'multiple_choice',
      properties: {
        name: 'sleep_issue',
        multiple: true,
        options: [
          {
            id: 'sleep-falling',
            label: 'Falling asleep',
            description: 'Takes more than 30 min',
            media: { type: 'emoji', value: '🌙' },
          },
          {
            id: 'sleep-staying',
            label: 'Staying asleep',
            description: 'Wake up during the night',
            media: { type: 'emoji', value: '⏰' },
          },
          {
            id: 'sleep-quality',
            label: 'Sleep quality',
            description: 'Wake up tired even after 8 hours',
            media: { type: 'emoji', value: '😴' },
          },
          {
            id: 'sleep-schedule',
            label: 'Inconsistent schedule',
            description: 'Different times each day',
            media: { type: 'emoji', value: '📅' },
          },
        ],
      },
      validations: { required: true, minChoices: 1 },
    } satisfies MultipleChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 15: Mental Wellness
const page15: Page = {
  id: 'page-15',
  name: 'Mental Wellness',
  blocks: [
    {
      id: 'block-15-1',
      type: 'heading',
      properties: { text: 'How would you describe your stress levels?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-15-2',
      type: 'multiple_choice',
      properties: {
        name: 'stress_level',
        multiple: false,
        options: [
          {
            id: 'stress-low',
            label: 'Generally Low',
            description: 'Life is pretty calm',
            media: { type: 'emoji', value: '😌' },
          },
          {
            id: 'stress-moderate',
            label: 'Moderate',
            description: 'Some stress but manageable',
            media: { type: 'emoji', value: '😐' },
          },
          {
            id: 'stress-high',
            label: 'High',
            description: 'Often feel overwhelmed',
            media: { type: 'emoji', value: '😰' },
          },
          {
            id: 'stress-severe',
            label: 'Very High',
            description: 'Constant stress affecting daily life',
            media: { type: 'emoji', value: '🆘' },
          },
        ],
      },
      validations: { required: true },
    } satisfies MultipleChoiceBlock,
    {
      id: 'block-15-3',
      type: 'spacer',
      properties: { size: 'md' },
    } satisfies SpacerBlock,
    {
      id: 'block-15-4',
      type: 'paragraph',
      properties: {
        text: "Remember: It's okay to seek professional help. This quiz provides general wellness tips, not medical advice.",
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 16: Sleep Optimizer
const page16: Page = {
  id: 'page-16',
  name: 'Sleep Optimization',
  blocks: [
    {
      id: 'block-16-1',
      type: 'heading',
      properties: { text: 'Your Sleep Improvement Plan', alignment: 'center' },
    } satisfies HeadingBlock,
    {
      id: 'block-16-2',
      type: 'paragraph',
      properties: {
        text: 'Based on your answers, here are evidence-based strategies to improve your sleep:',
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-16-3',
      type: 'list',
      properties: {
        orientation: 'vertical',
        textPlacement: 'right',
        size: 'lg',
        items: [
          {
            id: 'sleep-tip-1',
            title: 'Consistent Schedule',
            subtitle: 'Same time every day, even weekends',
            media: { type: 'emoji', value: '🕐' },
          },
          {
            id: 'sleep-tip-2',
            title: 'Cool & Dark Room',
            subtitle: '65-68°F, blackout curtains',
            media: { type: 'emoji', value: '🌑' },
          },
          {
            id: 'sleep-tip-3',
            title: 'No Screens Before Bed',
            subtitle: '1 hour before sleep',
            media: { type: 'emoji', value: '📵' },
          },
          {
            id: 'sleep-tip-4',
            title: 'Wind-Down Routine',
            subtitle: 'Reading, stretching, journaling',
            media: { type: 'emoji', value: '📖' },
          },
        ],
      },
    } satisfies ListBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 17: Lifestyle Assessment
const page17: Page = {
  id: 'page-17',
  name: 'Lifestyle Check',
  blocks: [
    {
      id: 'block-17-1',
      type: 'heading',
      properties: { text: 'Quick Lifestyle Assessment', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-17-2',
      type: 'paragraph',
      properties: {
        text: 'Select all the healthy habits you currently practice:',
        alignment: 'left',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-17-3',
      type: 'multiple_choice',
      properties: {
        name: 'current_habits',
        multiple: true,
        options: [
          { id: 'habit-water', label: 'Drink 8+ glasses of water daily', media: { type: 'emoji', value: '💧' } },
          { id: 'habit-breakfast', label: 'Eat a healthy breakfast', media: { type: 'emoji', value: '🍳' } },
          { id: 'habit-vegetables', label: 'Eat 5+ servings of vegetables', media: { type: 'emoji', value: '🥬' } },
          { id: 'habit-exercise', label: 'Exercise 3+ times per week', media: { type: 'emoji', value: '🏃' } },
          { id: 'habit-sleep', label: 'Get 7-9 hours of sleep', media: { type: 'emoji', value: '😴' } },
          { id: 'habit-meditation', label: 'Practice mindfulness/meditation', media: { type: 'emoji', value: '🧘' } },
        ],
      },
      validations: { required: false },
    } satisfies MultipleChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// ============================================
// Pages 18-21: Experience Level (Merge Point + Branches)
// ============================================

// Page 18: Experience Level (MERGE POINT)
const page18: Page = {
  id: 'page-18',
  name: 'Experience Level',
  blocks: [
    {
      id: 'block-18-1',
      type: 'heading',
      properties: { text: 'What is your fitness experience level?', alignment: 'left' },
    } satisfies HeadingBlock,
    {
      id: 'block-18-2',
      type: 'paragraph',
      properties: {
        text: "Be honest - we'll tailor the intensity and complexity of your plan accordingly.",
        alignment: 'left',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-18-3',
      type: 'multiple_choice',
      properties: {
        name: 'experience_level',
        multiple: false,
        options: [
          {
            id: 'exp-beginner',
            label: 'Beginner',
            description: 'New to fitness or returning after a long break',
            media: { type: 'emoji', value: '🌱' },
          },
          {
            id: 'exp-intermediate',
            label: 'Intermediate',
            description: '1-3 years of consistent training',
            media: { type: 'emoji', value: '🌿' },
          },
          {
            id: 'exp-advanced',
            label: 'Advanced',
            description: '3+ years, solid foundation',
            media: { type: 'emoji', value: '🌳' },
          },
        ],
      },
      validations: { required: true },
    } satisfies MultipleChoiceBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 19: Beginner Tips
const page19: Page = {
  id: 'page-19',
  name: 'Beginner Tips',
  blocks: [
    {
      id: 'block-19-1',
      type: 'heading',
      properties: { text: 'Starting Your Journey Right', alignment: 'center' },
    } satisfies HeadingBlock,
    {
      id: 'block-19-2',
      type: 'paragraph',
      properties: {
        text: "Welcome! As a beginner, consistency beats intensity. Here's what to focus on:",
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-19-3',
      type: 'spacer',
      properties: { size: 'md' },
    } satisfies SpacerBlock,
    {
      id: 'block-19-4',
      type: 'list',
      properties: {
        orientation: 'vertical',
        textPlacement: 'right',
        size: 'lg',
        items: [
          {
            id: 'beg-1',
            title: 'Start Small',
            subtitle: '2-3 sessions per week is plenty',
            media: { type: 'emoji', value: '🎯' },
          },
          {
            id: 'beg-2',
            title: 'Learn Form First',
            subtitle: 'Quality over quantity always',
            media: { type: 'emoji', value: '📚' },
          },
          {
            id: 'beg-3',
            title: 'Build Habits',
            subtitle: "Don't worry about optimization yet",
            media: { type: 'emoji', value: '🔄' },
          },
          {
            id: 'beg-4',
            title: 'Be Patient',
            subtitle: 'Results take 8-12 weeks to show',
            media: { type: 'emoji', value: '⏳' },
          },
        ],
      },
    } satisfies ListBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 20: Intermediate Tips
const page20: Page = {
  id: 'page-20',
  name: 'Intermediate Guidance',
  blocks: [
    {
      id: 'block-20-1',
      type: 'heading',
      properties: { text: 'Level Up Your Training', alignment: 'center' },
    } satisfies HeadingBlock,
    {
      id: 'block-20-2',
      type: 'paragraph',
      properties: {
        text: "You've built a foundation. Now it's time to get strategic about progression.",
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-20-3',
      type: 'list',
      properties: {
        orientation: 'vertical',
        textPlacement: 'right',
        size: 'lg',
        items: [
          {
            id: 'int-1',
            title: 'Progressive Overload',
            subtitle: 'Track and increase weights systematically',
            media: { type: 'emoji', value: '📈' },
          },
          {
            id: 'int-2',
            title: 'Periodization',
            subtitle: 'Cycle intensity and volume',
            media: { type: 'emoji', value: '🔄' },
          },
          {
            id: 'int-3',
            title: 'Dial In Nutrition',
            subtitle: 'Track macros, not just calories',
            media: { type: 'emoji', value: '🍗' },
          },
          {
            id: 'int-4',
            title: 'Prioritize Recovery',
            subtitle: 'Sleep and deload weeks matter',
            media: { type: 'emoji', value: '😴' },
          },
        ],
      },
    } satisfies ListBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// Page 21: Advanced Optimization
const page21: Page = {
  id: 'page-21',
  name: 'Advanced Optimization',
  blocks: [
    {
      id: 'block-21-1',
      type: 'heading',
      properties: { text: 'Advanced Optimization Strategies', alignment: 'center' },
    } satisfies HeadingBlock,
    {
      id: 'block-21-2',
      type: 'paragraph',
      properties: {
        text: "You're experienced. Let's fine-tune every detail for maximum results.",
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-21-3',
      type: 'gauge',
      properties: {
        value: 85,
        tooltipLabel: 'Your optimization potential',
        marks: ['Base', 'Good', 'Great', 'Elite'],
        minValue: 0,
        maxValue: 100,
      },
    } satisfies GaugeBlock,
    {
      id: 'block-21-4',
      type: 'list',
      properties: {
        orientation: 'vertical',
        textPlacement: 'right',
        size: 'sm',
        items: [
          {
            id: 'adv-1',
            title: 'Nutrient Timing',
            subtitle: 'Pre/intra/post workout nutrition',
            media: { type: 'emoji', value: '⏰' },
          },
          {
            id: 'adv-2',
            title: 'Advanced Techniques',
            subtitle: 'Drop sets, supersets, rest-pause',
            media: { type: 'emoji', value: '💥' },
          },
          {
            id: 'adv-3',
            title: 'Biofeedback',
            subtitle: 'HRV, sleep tracking, readiness scores',
            media: { type: 'emoji', value: '📊' },
          },
          {
            id: 'adv-4',
            title: 'Supplements',
            subtitle: 'Evidence-based stack optimization',
            media: { type: 'emoji', value: '💊' },
          },
        ],
      },
    } satisfies ListBlock,
  ],
  properties: { buttonText: 'Continue' },
}

// ============================================
// Pages 22-25: Loader + Results
// ============================================

// Page 22: Calculating Results (Loader)
const page22: Page = {
  id: 'page-22',
  name: 'Calculating',
  blocks: [
    {
      id: 'block-22-1',
      type: 'heading',
      properties: { text: 'Building Your Personalized Plan...', alignment: 'center' },
    } satisfies HeadingBlock,
    {
      id: 'block-22-2',
      type: 'loader',
      properties: {
        description: 'Analyzing your responses and creating your custom program',
        duration: 3000,
      },
    } satisfies LoaderBlock,
  ],
  properties: { buttonText: 'See My Results' },
}

// Page 23: Results - Basic Plan (Low Score)
const page23: Page = {
  id: 'page-23',
  name: 'Starter Plan',
  blocks: [
    {
      id: 'block-23-1',
      type: 'heading',
      properties: { text: 'Your Starter Plan is Ready!', alignment: 'center' },
    } satisfies HeadingBlock,
    {
      id: 'block-23-2',
      type: 'paragraph',
      properties: {
        text: "We've designed a gentle introduction to help you build sustainable habits. Start slow and build momentum!",
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-23-3',
      type: 'spacer',
      properties: { size: 'sm' },
    } satisfies SpacerBlock,
    {
      id: 'block-23-4',
      type: 'list',
      properties: {
        orientation: 'vertical',
        textPlacement: 'right',
        size: 'lg',
        items: [
          {
            id: 'starter-1',
            title: 'Foundation Program',
            subtitle: '3 days/week, 30 min sessions',
            media: { type: 'emoji', value: '🏃' },
          },
          {
            id: 'starter-2',
            title: 'Simple Meal Guidelines',
            subtitle: 'Easy to follow, no counting',
            media: { type: 'emoji', value: '🍽️' },
          },
          {
            id: 'starter-3',
            title: 'Daily Habit Tracker',
            subtitle: 'Build consistency first',
            media: { type: 'emoji', value: '✅' },
          },
          {
            id: 'starter-4',
            title: 'Community Support',
            subtitle: 'Beginner-friendly group',
            media: { type: 'emoji', value: '👥' },
          },
        ],
      },
    } satisfies ListBlock,
    {
      id: 'block-23-5',
      type: 'gauge',
      properties: {
        value: 25,
        tooltipLabel: 'Starting Point',
        marks: ['Start', '', '', 'Goal'],
        minValue: 0,
        maxValue: 100,
      },
    } satisfies GaugeBlock,
  ],
  properties: { buttonText: 'Get Started - $29/month', redirectUrl: 'https://example.com/starter' },
}

// Page 24: Results - Standard Plan (Mid Score)
const page24: Page = {
  id: 'page-24',
  name: 'Accelerator Plan',
  blocks: [
    {
      id: 'block-24-1',
      type: 'heading',
      properties: { text: 'Your Accelerator Plan is Ready!', alignment: 'center' },
    } satisfies HeadingBlock,
    {
      id: 'block-24-2',
      type: 'paragraph',
      properties: {
        text: 'You have a solid foundation. This plan will help you break through plateaus and reach the next level.',
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-24-3',
      type: 'gauge',
      properties: {
        value: 55,
        tooltipLabel: 'Your Current Level',
        marks: ['Beginner', 'Intermediate', 'Advanced', 'Elite'],
        minValue: 0,
        maxValue: 100,
      },
    } satisfies GaugeBlock,
    {
      id: 'block-24-4',
      type: 'list',
      properties: {
        orientation: 'vertical',
        textPlacement: 'right',
        size: 'lg',
        items: [
          {
            id: 'accel-1',
            title: 'Structured Periodization',
            subtitle: '4-5 days/week programming',
            media: { type: 'emoji', value: '📅' },
          },
          {
            id: 'accel-2',
            title: 'Macro-Based Nutrition',
            subtitle: 'Customized to your goals',
            media: { type: 'emoji', value: '🎯' },
          },
          {
            id: 'accel-3',
            title: 'Progress Analytics',
            subtitle: 'Track every metric',
            media: { type: 'emoji', value: '📊' },
          },
          {
            id: 'accel-4',
            title: 'Coaching Check-ins',
            subtitle: 'Bi-weekly form reviews',
            media: { type: 'emoji', value: '🎥' },
          },
        ],
      },
    } satisfies ListBlock,
  ],
  properties: { buttonText: 'Get Started - $59/month', redirectUrl: 'https://example.com/accelerator' },
}

// Page 25: Results - Premium Plan (High Score)
const page25: Page = {
  id: 'page-25',
  name: 'Elite Plan',
  blocks: [
    {
      id: 'block-25-1',
      type: 'heading',
      properties: { text: 'Your Elite Plan is Ready!', alignment: 'center' },
    } satisfies HeadingBlock,
    {
      id: 'block-25-2',
      type: 'paragraph',
      properties: {
        text: "You're ready for advanced optimization. This comprehensive plan covers every detail for maximum results.",
        alignment: 'center',
      },
    } satisfies ParagraphBlock,
    {
      id: 'block-25-3',
      type: 'gauge',
      properties: {
        value: 85,
        tooltipLabel: 'Your Optimization Score',
        marks: ['Base', 'Good', 'Great', 'Elite'],
        minValue: 0,
        maxValue: 100,
      },
    } satisfies GaugeBlock,
    {
      id: 'block-25-4',
      type: 'list',
      properties: {
        orientation: 'vertical',
        textPlacement: 'right',
        size: 'lg',
        items: [
          {
            id: 'elite-1',
            title: 'Fully Custom Programming',
            subtitle: 'Tailored to your biomechanics',
            media: { type: 'emoji', value: '🧬' },
          },
          {
            id: 'elite-2',
            title: 'Advanced Nutrition Protocol',
            subtitle: 'Nutrient timing & periodization',
            media: { type: 'emoji', value: '🔬' },
          },
          {
            id: 'elite-3',
            title: '1-on-1 Coaching',
            subtitle: 'Weekly video calls',
            media: { type: 'emoji', value: '👨‍🏫' },
          },
          {
            id: 'elite-4',
            title: 'Supplement Protocol',
            subtitle: 'Evidence-based recommendations',
            media: { type: 'emoji', value: '💊' },
          },
          {
            id: 'elite-5',
            title: 'Recovery Optimization',
            subtitle: 'Sleep, HRV, deload strategies',
            media: { type: 'emoji', value: '🔋' },
          },
        ],
      },
    } satisfies ListBlock,
  ],
  properties: { buttonText: 'Get Started - $149/month', redirectUrl: 'https://example.com/elite' },
}

// ============================================
// Aggregate Pages Array
// ============================================

export const mockPages: Page[] = [
  page1, // Welcome
  page2, // Name Input
  page3, // Age Group
  page4, // Primary Goal (BRANCH)
  page5, // Weight Loss - Diet Type (BRANCH)
  page6, // Keto Details
  page7, // Calorie Approach
  page8, // Activity Level
  page9, // Muscle - Training Type
  page10, // Muscle - Equipment (BRANCH)
  page11, // Gym Program
  page12, // Home Program
  page13, // Health - Focus Area (BRANCH)
  page14, // Sleep Assessment
  page15, // Mental Wellness
  page16, // Sleep Optimizer
  page17, // Lifestyle Check
  page18, // Experience Level (MERGE + BRANCH)
  page19, // Beginner Tips
  page20, // Intermediate Tips
  page21, // Advanced Tips
  page22, // Loader
  page23, // Results - Starter
  page24, // Results - Accelerator
  page25, // Results - Elite
]

// ============================================
// Complex Rules with Various Operators
// ============================================

export const mockRules: Rule[] = [
  // ----------------------------------------
  // Page 4: Primary Goal (3-way branch using 'eq')
  // ----------------------------------------
  {
    pageId: 'page-4',
    actions: [
      // Weight Loss path
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-4-2' },
            { type: 'constant', value: 'goal-weight-loss' },
          ],
        },
        details: { to: { type: 'page', value: 'page-5' } },
      },
      // Muscle Building path
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-4-2' },
            { type: 'constant', value: 'goal-muscle' },
          ],
        },
        details: { to: { type: 'page', value: 'page-9' } },
      },
      // Health Improvement path
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-4-2' },
            { type: 'constant', value: 'goal-health' },
          ],
        },
        details: { to: { type: 'page', value: 'page-13' } },
      },
      // Initialize score variable
      {
        type: 'set',
        condition: { op: 'always', vars: [] },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 0 },
        },
      },
    ],
  },

  // ----------------------------------------
  // Page 5: Diet Type (2-way branch using 'eq' + score updates)
  // ----------------------------------------
  {
    pageId: 'page-5',
    actions: [
      // Keto diet → Keto details page
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-5-3' },
            { type: 'constant', value: 'diet-keto' },
          ],
        },
        details: { to: { type: 'page', value: 'page-6' } },
      },
      // Mediterranean gets bonus points (more sustainable)
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-5-3' },
            { type: 'constant', value: 'diet-mediterranean' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 15 },
        },
      },
      // All non-keto diets → Calorie approach page
      {
        type: 'jump',
        condition: {
          op: 'neq',
          vars: [
            { type: 'block', value: 'block-5-3' },
            { type: 'constant', value: 'diet-keto' },
          ],
        },
        details: { to: { type: 'page', value: 'page-7' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 6: Keto Details → Activity Level
  // ----------------------------------------
  {
    pageId: 'page-6',
    actions: [
      // Strict keto shows dedication (+10 score)
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-6-3' },
            { type: 'constant', value: 'keto-strict' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 10 },
        },
      },
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-8' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 7: Calorie Approach → Activity Level
  // ----------------------------------------
  {
    pageId: 'page-7',
    actions: [
      // Strict tracking shows commitment (+10 score)
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-7-2' },
            { type: 'constant', value: 'track-strict' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 10 },
        },
      },
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-8' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 8: Activity Level → Experience Level (merge point)
  // Score based on activity level using 'or' operator
  // ----------------------------------------
  {
    pageId: 'page-8',
    actions: [
      // High activity = higher score (using OR for multiple high-activity options)
      {
        type: 'add',
        condition: {
          op: 'or',
          vars: [
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-8-2' },
                { type: 'constant', value: 'activity-very' },
              ],
            },
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-8-2' },
                { type: 'constant', value: 'activity-moderate' },
              ],
            },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 20 },
        },
      },
      // Low activity = lower score
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-8-2' },
            { type: 'constant', value: 'activity-sedentary' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 5 },
        },
      },
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-18' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 9: Training Type → Equipment Access
  // ----------------------------------------
  {
    pageId: 'page-9',
    actions: [
      // CrossFit/HIIT shows high intensity preference
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-9-2' },
            { type: 'constant', value: 'train-crossfit' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 15 },
        },
      },
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-10' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 10: Equipment Access (2-way branch)
  // ----------------------------------------
  {
    pageId: 'page-10',
    actions: [
      // Full gym access → Gym program
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-10-2' },
            { type: 'constant', value: 'equip-gym' },
          ],
        },
        details: { to: { type: 'page', value: 'page-11' } },
      },
      // Gym access = bonus points (more options)
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-10-2' },
            { type: 'constant', value: 'equip-gym' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 10 },
        },
      },
      // Home (basic or none) → Home program
      {
        type: 'jump',
        condition: {
          op: 'or',
          vars: [
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-10-2' },
                { type: 'constant', value: 'equip-home-basic' },
              ],
            },
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-10-2' },
                { type: 'constant', value: 'equip-home-none' },
              ],
            },
          ],
        },
        details: { to: { type: 'page', value: 'page-12' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 11: Gym Program → Experience Level
  // ----------------------------------------
  {
    pageId: 'page-11',
    actions: [
      // Advanced splits indicate experience
      {
        type: 'add',
        condition: {
          op: 'or',
          vars: [
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-11-3' },
                { type: 'constant', value: 'split-ppl' },
              ],
            },
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-11-3' },
                { type: 'constant', value: 'split-bro' },
              ],
            },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 15 },
        },
      },
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-18' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 12: Home Program → Experience Level
  // ----------------------------------------
  {
    pageId: 'page-12',
    actions: [
      // 5+ days shows commitment
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-12-4' },
            { type: 'constant', value: 'freq-5' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 10 },
        },
      },
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-18' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 13: Health Focus (Branch using 'or' for similar paths)
  // ----------------------------------------
  {
    pageId: 'page-13',
    actions: [
      // Sleep focus → Sleep assessment
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-13-2' },
            { type: 'constant', value: 'focus-sleep' },
          ],
        },
        details: { to: { type: 'page', value: 'page-14' } },
      },
      // Mental wellness or stress → Mental wellness page
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-13-2' },
            { type: 'constant', value: 'focus-mental' },
          ],
        },
        details: { to: { type: 'page', value: 'page-15' } },
      },
      // Other health focuses → Skip to lifestyle check
      {
        type: 'jump',
        condition: {
          op: 'or',
          vars: [
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-13-2' },
                { type: 'constant', value: 'focus-energy' },
              ],
            },
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-13-2' },
                { type: 'constant', value: 'focus-heart' },
              ],
            },
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-13-2' },
                { type: 'constant', value: 'focus-longevity' },
              ],
            },
          ],
        },
        details: { to: { type: 'page', value: 'page-17' } },
      },
      // Longevity focus = bonus (long-term thinking)
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-13-2' },
            { type: 'constant', value: 'focus-longevity' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 10 },
        },
      },
    ],
  },

  // ----------------------------------------
  // Page 14: Sleep Assessment → Sleep Optimizer
  // ----------------------------------------
  {
    pageId: 'page-14',
    actions: [
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-16' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 15: Mental Wellness → Lifestyle Check
  // Score adjustment based on stress (AND example)
  // ----------------------------------------
  {
    pageId: 'page-15',
    actions: [
      // Low stress AND seeking improvement = good candidate (+15)
      {
        type: 'add',
        condition: {
          op: 'or',
          vars: [
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-15-2' },
                { type: 'constant', value: 'stress-low' },
              ],
            },
            {
              op: 'eq',
              vars: [
                { type: 'block', value: 'block-15-2' },
                { type: 'constant', value: 'stress-moderate' },
              ],
            },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 15 },
        },
      },
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-17' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 16: Sleep Optimizer → Lifestyle Check
  // ----------------------------------------
  {
    pageId: 'page-16',
    actions: [
      {
        type: 'add',
        condition: { op: 'always', vars: [] },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 5 },
        },
      },
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-17' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 17: Lifestyle Check → Experience Level (merge)
  // ----------------------------------------
  {
    pageId: 'page-17',
    actions: [
      // Add points for good habits (always add a base amount)
      {
        type: 'add',
        condition: { op: 'always', vars: [] },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 10 },
        },
      },
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-18' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 18: Experience Level (3-way branch + score updates)
  // ----------------------------------------
  {
    pageId: 'page-18',
    actions: [
      // Beginner → Beginner tips (+ small score)
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-18-3' },
            { type: 'constant', value: 'exp-beginner' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 5 },
        },
      },
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-18-3' },
            { type: 'constant', value: 'exp-beginner' },
          ],
        },
        details: { to: { type: 'page', value: 'page-19' } },
      },
      // Intermediate → Intermediate tips (+ medium score)
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-18-3' },
            { type: 'constant', value: 'exp-intermediate' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 20 },
        },
      },
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-18-3' },
            { type: 'constant', value: 'exp-intermediate' },
          ],
        },
        details: { to: { type: 'page', value: 'page-20' } },
      },
      // Advanced → Advanced tips (+ high score)
      {
        type: 'add',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-18-3' },
            { type: 'constant', value: 'exp-advanced' },
          ],
        },
        details: {
          target: { type: 'variable', value: 'score' },
          value: { type: 'constant', value: 35 },
        },
      },
      {
        type: 'jump',
        condition: {
          op: 'eq',
          vars: [
            { type: 'block', value: 'block-18-3' },
            { type: 'constant', value: 'exp-advanced' },
          ],
        },
        details: { to: { type: 'page', value: 'page-21' } },
      },
    ],
  },

  // ----------------------------------------
  // Pages 19, 20, 21: All go to Loader
  // ----------------------------------------
  {
    pageId: 'page-19',
    actions: [
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-22' } },
      },
    ],
  },
  {
    pageId: 'page-20',
    actions: [
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-22' } },
      },
    ],
  },
  {
    pageId: 'page-21',
    actions: [
      {
        type: 'jump',
        condition: { op: 'always', vars: [] },
        details: { to: { type: 'page', value: 'page-22' } },
      },
    ],
  },

  // ----------------------------------------
  // Page 22: Loader → Results (Branch based on score using lt/gte)
  // ----------------------------------------
  {
    pageId: 'page-22',
    actions: [
      // Low score (< 30) → Starter plan
      {
        type: 'jump',
        condition: {
          op: 'lt',
          vars: [
            { type: 'variable', value: 'score' },
            { type: 'constant', value: 30 },
          ],
        },
        details: { to: { type: 'page', value: 'page-23' } },
      },
      // High score (>= 70) → Elite plan
      {
        type: 'jump',
        condition: {
          op: 'gte',
          vars: [
            { type: 'variable', value: 'score' },
            { type: 'constant', value: 70 },
          ],
        },
        details: { to: { type: 'page', value: 'page-25' } },
      },
      // Mid score (30-69) → Accelerator plan (using AND: >= 30 AND < 70)
      {
        type: 'jump',
        condition: {
          op: 'and',
          vars: [
            {
              op: 'gte',
              vars: [
                { type: 'variable', value: 'score' },
                { type: 'constant', value: 30 },
              ],
            },
            {
              op: 'lt',
              vars: [
                { type: 'variable', value: 'score' },
                { type: 'constant', value: 70 },
              ],
            },
          ],
        },
        details: { to: { type: 'page', value: 'page-24' } },
      },
    ],
  },
]
