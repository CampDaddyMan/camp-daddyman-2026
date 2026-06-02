import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// ── Seed data — Days 1-3 ──────────────────────────────────────────────────────

export const SEED_DAYS = [
  {
    dayNumber: 1,
    phase: 'EGG',
    title: 'Welcome to the Ark',
    lie: "I don't matter.",
    truth: 'You do.',
    body: `Before we begin—

We don't know your name.

We don't know what city you're in, or what it cost you to get through today.

We don't know who hurt you.

We don't know who you hurt.

We don't know what you've tried and abandoned.

We don't know what they said about you when you weren't in the room.

We don't know what you say about yourself when no one else can hear.

But we know you're here.

And we know that matters.

—

You didn't come here because life is going well.

People don't find the Ark when everything is fine.

They find it when something in them is restless.

When the thing they've been carrying gets too heavy to carry quietly.

When the version of themselves that could have been keeps knocking.

—

There is a version of you the world has not seen yet.

Not a better you. Not a fixed you.

The one that was there before the damage.

Before the first time someone looked at you and found you wanting.

Before you learned to agree with them.

—

A butterfly is not built after the chrysalis.

It was hidden inside the caterpillar all along.

The wings were already there.

Sleeping.

Waiting.

—

We're not asking you to believe that today.

We're asking you to consider it possible.`,
    daddyManism: 'Di wings did inna yuh di whole time.',
    reflectionPrompt: 'What is one good thing about yourself that you stopped believing somewhere along the way? Not a skill. Not an achievement. A quality. Something about who you are.',
    challengePrompt: "Write down one thing you've done — in your whole life — that you're proud of. Not for anyone else. For yourself. If you can't think of one, write about a time you kept going when you could have stopped. That counts.",
    livityPrompt: "Encourage one person today before you sleep. Not because they earned it. Not because they asked. Because someone once needed exactly what you're about to give — and nobody came. You can be the one who comes.",
    journalPrompt: 'What have you stopped allowing yourself to hope for?',
    closingText: "You are not here to become someone else.\n\nYou are here to find out who was inside you all along.\n\n—\n\nSomebody tended this field before you arrived.\n\nOne day, someone will say the same of you.\n\nEvery forest begins with something small that stayed.",
    published: true,
  },
  {
    dayNumber: 2,
    phase: 'EGG',
    title: 'The Seed',
    lie: "Nothing I do matters.",
    truth: 'It does.',
    body: `You came back.

That's the first thing.

Some people read Day 1 and felt something shift.

Some felt nothing.

Some felt worse — because being seen can be more frightening than being invisible, if being seen has never been safe.

All of that is fine.

You came back.

That is the seed.

—

Most lives don't change because of breakthroughs.

They change because of something far less dramatic:

One small action, taken before the feeling arrives.

Fields don't grow from miracles.

Fields grow from seeds.

Seeds that look like nothing when they go in the ground.

Seeds that feel like nothing.

Seeds that go silent for weeks before anything shows.

Most seeds look ridiculous when they're planted.

But forests begin this way.

Movements begin this way.

Lives begin this way.

You do not have to change your whole life today.

You only have to plant one thing.`,
    daddyManism: 'Plant di seed before di season tell yuh to.',
    reflectionPrompt: "Where in your life have you stopped trying because you decided small actions don't count?",
    challengePrompt: "Choose one small action you've been avoiding. Something that can be completed in fifteen minutes or less. Do it before this day ends. Do not wait for motivation. Do not wait for confidence. The feeling comes after the seed is planted. Not before.",
    livityPrompt: "Do one helpful thing for someone today without telling anyone you did it. Not for recognition. Not for praise. The act is real whether anyone witnesses it or not. Log it here truthfully.",
    journalPrompt: 'What seed did I plant today?',
    closingText: "You are not here to change the world today.\n\nYou are here to plant one thing.\n\nA year from now, you may not remember this moment.\n\nBut the tree will.\n\nEvery forest begins with something small that stayed.",
    published: true,
  },
  {
    dayNumber: 3,
    phase: 'EGG',
    title: 'The Weight',
    lie: "I'm alone in this.",
    truth: 'You are not the first.',
    body: `There is a particular kind of alone that nobody talks about.

Not the kind that comes from being by yourself.

The kind that comes from being surrounded by people and still carrying something nobody else seems to see.

Where everyone around you is functioning — laughing, working, moving through their days —

and you are performing functioning while something else happens underneath.

If you know that feeling, this day is for you.

—

You are not the first person to carry it.

You are not an aberration.

You are not uniquely broken.

The Ark exists because people who carried heavy things refused to let those things have the final word.

They didn't find their way by becoming less alone.

They found it by discovering that the loneliness wasn't proof of their worthlessness.

It was just a feeling.

And underneath it — a lie.

The lie is this: the fact that I feel alone means something is wrong with me.

There isn't.

It means you're carrying something real.

Real things are heavy.`,
    daddyManism: 'Di heaviest load is di one nobody know yuh carrying.',
    reflectionPrompt: "When was the last time someone truly understood what you were carrying? Not what you showed them. What you were actually carrying.",
    challengePrompt: "Tell one true thing to one person today. Not all of it. Not the deepest thing. Just one thing that is real, that you haven't said out loud.",
    livityPrompt: "Ask one person how they're actually doing. Not as a greeting. As a question. Wait for the real answer.",
    journalPrompt: "What am I carrying that I've never said out loud?",
    closingText: "You are not the first to carry this.\n\nYou will not be the last.\n\nBut today — you carried it forward.\n\nAnd the field remembers every step.",
    published: true,
  },
  {
    dayNumber: 4,
    phase: 'EGG',
    title: 'Not Your Wounds',
    lie: 'I am what was done to me.',
    truth: 'You are not your wounds.',
    body: `Something happened to you.

We are not going to tell you it didn't.

We are not going to tell you it made you stronger. Or that everything happens for a reason. Or that you should be grateful for the lessons.

Something happened.

And it changed you.

—

But changed is not the same as became.

A wound marks the body that carries it. It alters the way certain things feel, certain rooms feel, certain kinds of touch feel.

But the wound is not the body.

The body was there before the wound arrived.

And the body is still there now.

—

Somewhere along the way, the thing that happened to you stopped being something you carried and started being something you were.

That is the lie.

Not the wound — the wound is real.

The lie is that the wound is you.

—

The butterfly's wings are not the scars of the caterpillar.

They grew in the same body that survived everything the caterpillar survived.

But they are not the damage.

They are what was already there, waiting.`,
    daddyManism: 'Dem mark yuh. Dem neva mek yuh.',
    reflectionPrompt: 'What is one thing about you that existed before the wound? A quality, a way of seeing, a part of yourself that was there before what happened. Can you still find it?',
    challengePrompt: 'Write a list of three things that are true about you that have nothing to do with what was done to you. Not achievements. Not roles. Who you are underneath. Take as long as you need.',
    livityPrompt: 'Do something today for someone who has been marked by something hard. Not to fix it. Just to remind them that the mark is not the whole of them.',
    journalPrompt: 'Who was I before the wound became the story I told about myself?',
    closingText: "You are not what was done to you.\n\nYou are what survived it.\n\n—\n\nThe field was here before the storm.\n\nAnd it is still here now.",
    published: true,
  },
  {
    dayNumber: 5,
    phase: 'EGG',
    title: 'No Ticket Needed',
    lie: 'I have to earn the right to belong.',
    truth: "You don't.",
    body: `You have been paying rent on a place that was always yours.

Working to justify a space you were born with the right to occupy.

Performing to earn a belonging that was never meant to be earned.

—

Think about how long you have been keeping that ledger.

Everything you have done.

Everything you have provided.

Everything you have produced.

And underneath all of it — the quiet belief that if you stopped, if you had nothing left to offer, you would not deserve to be here.

—

That belief arrived before you could question it.

You did not choose it.

But you have been paying it ever since.

—

The field does not ask what the rain has earned before it receives it.

The soil does not require the seed to prove its worth.

Belonging is not a wage.

You were not born owing the debt you have spent your whole life trying to repay.

—

You can stop buying a ticket to a place you already have the right to be.`,
    daddyManism: 'Yuh nuh haffi earn di right fi belong to di earth yuh was born on.',
    reflectionPrompt: 'Where in your life are you still trying to earn something you already have? Where have you been performing belonging instead of simply being here?',
    challengePrompt: 'Do one thing today for no reason other than that you wanted to. Not because it was productive. Not because it proved something. Just because you are allowed to want things.',
    livityPrompt: 'Welcome someone today who looks like they are waiting to be told they belong here. You do not need to say it in words. Show it in how you treat them.',
    journalPrompt: 'If I already belonged here — fully, without having to earn it — what would I stop doing? What would I start?',
    closingText: "You were never in debt.\n\nYou were always already home.\n\n—\n\nStop knocking on a door that was never locked.",
    published: true,
  },
  {
    dayNumber: 6,
    phase: 'EGG',
    title: 'Not Too Late',
    lie: "It's too late for me.",
    truth: "The chrysalis doesn't care how old the caterpillar is.",
    body: `You have done the math.

You have counted the years that passed while you were somewhere else.

The choices that took you in the wrong direction.

The time spent becoming something you did not want to be.

And the calculation comes out the same every time:

Too late.

—

But the calculation has a flaw.

It assumes transformation has a deadline.

It doesn't.

—

The chrysalis does not ask the caterpillar when it arrived.

It does not check how long the journey took, or how many wrong turns were made, or how much time was spent in the wrong place.

It only asks: are you here now?

—

What was wasted was wasted. We are not going to pretend otherwise.

But the field that remains is still a field.

The late rain still reaches the ground.

The seed planted in a season you thought had passed can still become something.

—

The only arrival that counts for nothing is the one you never make.`,
    daddyManism: 'Di chrysalis nuh ask di caterpillar how long it tek fi get here.',
    reflectionPrompt: "What have you told yourself is too late — that you haven't fully examined? Write it down. Then ask honestly: is that true, or is that the fear talking?",
    challengePrompt: 'Take one step today toward something you told yourself you missed your chance at. Not the whole thing. One step. The size of the step does not matter. Only the direction.',
    livityPrompt: 'Tell someone today that it is not too late for them. Someone who needs to hear it. Not as empty encouragement. As truth you actually believe. Mean every word.',
    journalPrompt: 'What would I begin if I truly believed it was not too late?',
    closingText: "The field doesn't count the years between the rain.\n\nIt only knows: did the rain come?\n\nYou came.\n\nThat is enough to begin.",
    published: true,
  },
  {
    dayNumber: 7,
    phase: 'EGG',
    title: 'Knowing Comes Later',
    lie: "I don't know who I am.",
    truth: "You don't need to know yet. Knowing is the journey.",
    body: `You have been waiting to know.

Waiting until you understood yourself — what you stood for, what you were made of, what name to give yourself.

As if identity was something that had to be found first and lived second.

As if you needed the answer before you could take the step.

—

But no one is born knowing.

The caterpillar does not know it is a butterfly before it enters the chrysalis.

The seed does not know it is a forest before it cracks open in the ground.

Identity is not a prerequisite for becoming.

It is the result of it.

—

You will not figure out who you are by thinking harder about it.

You will figure it out by doing something.

By choosing something.

By refusing something.

By showing up somewhere you were afraid to show up.

By staying when everything in you wanted to leave.

—

You do not need to know who you are to take the next step.

You need to take the next step to find out.

—

Knowing comes later.

Begin anyway.`,
    daddyManism: 'Yuh nuh haffi know yuh name fi answer when life call yuh.',
    reflectionPrompt: 'What are you waiting to know or understand before you feel ready to begin? Name it. Then ask: is that a real prerequisite, or a reason to wait?',
    challengePrompt: 'Do one thing today as if you already knew who you were — as if the question had been answered. Act from that place for just today. Notice what it feels like.',
    livityPrompt: 'Ask someone what they are becoming. Not what they do. Not what they have. What they are becoming. Then listen like the answer matters — because it does.',
    journalPrompt: 'What would I do today if I stopped waiting to know who I am?',
    closingText: "The butterfly did not know its name inside the chrysalis.\n\nIt came out flying anyway.\n\n—\n\nKnowing comes later.\n\nBegin now.",
    published: true,
  },
  {
    dayNumber: 8,
    phase: 'EGG',
    title: 'Nobody Came',
    lie: 'If I was important, someone would have come for me.',
    truth: 'Their absence does not measure your worth.',
    body: `You waited for someone to come.

Maybe as a child. Maybe as an adult. Maybe both.

You waited for the parent who was supposed to show up. The friend who was supposed to notice. The person who should have known something was wrong without being told.

And they didn't come.

—

And in that silence, a conclusion formed.

Not out loud. Not in words you chose.

It arrived the way these things always arrive — quietly, before you were old enough to question it:

If I mattered, someone would have come.

—

That conclusion is wrong.

Not because the people who didn't come weren't supposed to.

But because what they did or didn't do was never a measure of you.

Their absence measures them.

Not you.

—

People fail to show up for many reasons.

Most of them have nothing to do with the person they didn't show up for.

They were broken. They were scared. They were somewhere inside their own damage, with nothing left to see past it.

You were not invisible because you lacked worth.

You were unseen because they lacked vision.

—

Those are different things.

And the distinction matters more than you know.`,
    daddyManism: 'Dem nuh come nuh mean yuh nuh matter. It mean dem never have eyes fi see.',
    reflectionPrompt: 'Who did you wait for that never came? And what conclusion did you draw from their absence about your own worth?',
    challengePrompt: "Write a letter to the person who didn't come — not to send, just to say what you needed from them. Then write one sentence that is true: their absence was about them, not about you.",
    livityPrompt: 'Show up for someone today who is not expecting you. Not because they asked. Because someone should have shown up for them a long time ago, and you can be that person now.',
    journalPrompt: "What did I decide about my own worth because someone didn't come?",
    closingText: "Their absence was never a verdict on you.\n\nIt was a verdict on them.\n\n—\n\nYou were worth coming for.\n\nSomebody just didn't know how to get there.",
    published: true,
  },
  {
    dayNumber: 9,
    phase: 'EGG',
    title: 'The Hidden Self',
    lie: 'I must hide the real me to survive.',
    truth: 'Hiding protected you once. It cannot become your home.',
    body: `You learned early that certain things about you were not safe to show.

Maybe it was a feeling. A way of thinking. A part of your personality that got met with ridicule, or punishment, or silence.

And so you hid it.

Not because you were weak. Because you were smart.

Hiding was the right decision in that room.

—

But you are not in that room anymore.

Or at least — you don't have to be.

—

The problem with hiding is that it works.

It keeps you safe. It keeps the peace. It keeps the people around you comfortable.

And somewhere in the years of it working, you forgot it was a strategy.

It started to feel like survival.

Then it started to feel like you.

—

But the hidden thing is still there.

Still yours.

It did not stop existing because you stopped showing it.

—

You do not have to throw the door open today.

You do not have to perform vulnerability for anyone.

But you do have to say, quietly, to yourself:

The hiding was the shelter.

Not the self.`,
    daddyManism: "Di mask did save yuh once. But yuh cyan't live inna it forever.",
    reflectionPrompt: 'What part of you did you learn to hide? When did you learn to hide it? What were you afraid would happen if people saw it?',
    challengePrompt: "Show one real thing today to one safe person. It doesn't have to be your deepest truth. Just something you would normally keep hidden. Notice whether the world ends. It won't.",
    livityPrompt: 'Create a space today where someone else feels safe enough to be real. Ask a question that invites honesty. Hold what they give you carefully.',
    journalPrompt: "What have I been hiding that I'm ready to let someone see?",
    closingText: "The hiding kept you safe.\n\nBut safety is not the same as home.\n\n—\n\nThe real you has been waiting.\n\nIt is still there.",
    published: true,
  },
  {
    dayNumber: 10,
    phase: 'EGG',
    title: 'The Pain Is Real',
    lie: 'My pain makes me weak.',
    truth: 'Pain means something real happened. Weakness is not the same as woundedness.',
    body: `There is a kind of strength that is not strength at all.

It is performance.

It is the face you hold while something breaks underneath.

It is the "I'm fine" you have said so many times you started to believe it.

It is the belief that feeling pain makes you weak — and that the solution is to feel less.

—

But pain is not weakness.

Pain is information.

It means something real happened.

It means something in you was built to register damage — and it is doing exactly what it was built to do.

—

The person who touches fire and does not feel it is not strong.

They are numb.

And numbness is not a destination. It is a wound wearing a disguise.

—

Your pain is not evidence of failure.

It is evidence that you were present for something that cost you.

That you were there. That it mattered. That you are not made of stone.

—

You are allowed to hurt.

The hurt does not mean you are losing.

It means you are real.`,
    daddyManism: 'Di one who feel pain is not weak. Di one who feel nothing — dat is di one in trouble.',
    reflectionPrompt: 'Where are you performing strength right now instead of feeling what is actually there? What are you calling weakness that might just be humanness?',
    challengePrompt: "Name one thing today that has been hurting that you have been pretending isn't. You don't have to tell anyone. Just tell yourself the truth about it.",
    livityPrompt: 'Sit with someone who is hurting today. You do not need to fix it or explain it. Just stay. Your presence is the thing.',
    journalPrompt: 'What pain have I been calling weakness that deserves to be called real?',
    closingText: "You are not weak because you hurt.\n\nYou are human.\n\n—\n\nThe field feels the rain.\n\nThat is how it knows it is still alive.",
    published: true,
  },
  {
    dayNumber: 11,
    phase: 'EGG',
    title: 'Still Growing',
    lie: 'I am too damaged to grow.',
    truth: 'Damage is not destiny.',
    body: `You have decided something about yourself.

Not out loud. Not formally.

But somewhere underneath the daily business of living, a determination was made:

This is as far as I go.

The damage is too deep.

The patterns are too old.

The window for becoming something different has closed.

—

That determination is the lie.

Not the damage — the damage is real.

The lie is that damage is the last word.

—

Consider the field.

A field that has been flooded, or burned, or left untended for years looks like evidence that nothing will grow there again.

But that is not what the evidence says.

What it says is: something happened here.

It does not say: nothing can happen here again.

—

You are not your worst season.

You are not the sum of what broke you.

You are a field that has been through something.

And fields that have been through something — if they receive water, if they receive tending — grow things that fields that never suffered cannot.

The roots go deeper.

The soil holds more.

—

You are not too damaged to grow.

You are deeply rooted.`,
    daddyManism: "Damage is not di end of di story. Sometimes a just di beginning of di real one.",
    reflectionPrompt: 'Where have you decided growth is no longer possible for you? What made you draw that line? When did damage become destiny in your mind?',
    challengePrompt: 'Find one example — from history, from someone you know, from your own life — of something growing after damage. Let it be evidence. You are not the exception to this pattern.',
    livityPrompt: 'Tell someone who has given up on their own growth that it is not over. Not with advice. With your presence and your belief in them.',
    journalPrompt: 'What would I try if I believed damage was not my destiny?',
    closingText: "You are not your worst season.\n\nYou are the field that survived it.\n\n—\n\nDeep roots grow in hard ground.\n\nYou are more ready than you know.",
    published: true,
  },
  {
    dayNumber: 12,
    phase: 'EGG',
    title: 'Seen Anyway',
    lie: 'Nobody sees me.',
    truth: 'Being unseen is not the same as being invisible.',
    body: `You have become very good at not being seen.

You have practiced it.

You take up less space than you need. You speak a little quieter than your thought deserves. You wait to be invited before you offer what you have to give.

And somewhere in all that practice, the invisibility started to feel like truth.

Like evidence.

Like: nobody sees me because there is nothing worth seeing.

—

But being unseen is not the same as being invisible.

Invisible means you aren't there.

Unseen means the people around you haven't learned how to look.

—

You have been in rooms where the most valuable thing went unnoticed.

You have walked past art without registering it.

You have sat next to someone who would have changed your life if you had asked one right question.

The art was still art.

The person was still that person.

The seeing was the variable.

—

You are not invisible.

You are in a room where the lighting is wrong.

That is not a permanent condition.`,
    daddyManism: 'Di tree in di forest is still a tree, even when nobody walk past it.',
    reflectionPrompt: 'Where have you made yourself smaller to avoid being seen? What did you protect yourself from — and what did that cost you?',
    challengePrompt: 'Take up your full space in one moment today where you normally shrink. Speak at your actual volume. Offer the thought you would normally keep. Let yourself be present.',
    livityPrompt: 'See someone today who is not being seen. Call them by name. Ask them a real question. Let them know they registered.',
    journalPrompt: 'What would I offer if I believed it was worth seeing?',
    closingText: "You are not invisible.\n\nYou are unseen.\n\nThose are not the same thing.\n\n—\n\nThe field doesn't disappear because nobody is looking.\n\nIt is still growing.",
    published: true,
  },
  {
    dayNumber: 13,
    phase: 'EGG',
    title: 'Sleeping Wings',
    lie: 'I have nothing good inside me.',
    truth: 'The wings were already there.',
    body: `You have looked inside and found nothing worth keeping.

Not nothing — you can function. You can perform. You can produce things the world finds useful.

But at the core of it, when you look past the performance, you find: empty. Or broken. Or nothing that anyone would choose if they saw it clearly.

—

This is the deepest lie of Ring 1.

Not because it feels small — it doesn't. It feels absolute.

But because it is wrong in a specific way:

You have been looking for the wings in the caterpillar.

—

They are not visible yet.

That is not evidence they are not there.

The caterpillar, in the last stage before the chrysalis, does not look like something that is about to become extraordinary.

It looks like a caterpillar.

The wings are already forming — hidden, unrecognizable, not yet anything the eye can name.

—

What you cannot see inside yourself is not absence.

It may simply be wings in a form you don't yet recognize.

The good that is in you does not wear the shape you were told goodness wears.

It does not announce itself the way you expect.

—

It is there.

Sleeping.

Waiting for the conditions to become what it was always going to be.`,
    daddyManism: "Yuh cyan't see di wings yet. Dat nuh mean dem nuh deh.",
    reflectionPrompt: "What have you decided is not inside you that might simply be unformed — not absent, but not yet visible? What good do you dismiss in yourself before anyone else gets the chance to?",
    challengePrompt: "Ask one person who knows you what they see in you that you don't see in yourself. Do not deflect. Do not argue. Just receive it. Write it down.",
    livityPrompt: 'Tell someone today what you see in them that they may not see in themselves. Be specific. Make it real. Let them feel it land.',
    journalPrompt: 'What might be sleeping inside me that I have been calling absence?',
    closingText: "The wings were always there.\n\nNot visible.\n\nNot formed.\n\nBut already yours.\n\n—\n\nDi wings did inna yuh di whole time.",
    published: true,
  },
  {
    dayNumber: 14,
    phase: 'EGG',
    title: 'Imaginal Cells',
    lie: 'The part of me trying to become is the enemy.',
    truth: 'The imaginal cells were attacked before they became wings.',
    body: `Here is something most people don't know about the butterfly.

Inside the chrysalis, when the caterpillar begins to dissolve, new cells appear.

They are called imaginal cells.

They carry the blueprint of the butterfly — the wings, the colors, everything the caterpillar cannot imagine becoming.

And the caterpillar's own immune system attacks them.

—

The body attacks what is trying to become.

—

You may know this feeling.

The part of you that is trying to change — the version of yourself reaching for something different — has been under attack.

Not always from outside.

From inside.

From the habits and beliefs that kept you alive and are now fighting what is trying to emerge.

From the fear of what the change will cost.

From the old identity that does not want to dissolve.

—

The imaginal cells were attacked.

And they won anyway.

They found each other. They held. They organized in the dark.

And the caterpillar became what it could not imagine.

—

The part of you that is trying to become is not the enemy.

It is the most important thing in you.

Do not let the old immune system win.`,
    daddyManism: 'Di body attack what it nuh understand. But what it attack can still win.',
    reflectionPrompt: 'What part of you is trying to emerge that you keep attacking? What does that part want — and what in you is afraid of it?',
    challengePrompt: 'Do one thing today that supports the part of you that is trying to become. Not a big thing. Feed it. Protect it. Let it know you are on its side.',
    livityPrompt: "Find someone whose growth is being attacked — by others or by themselves — and stand beside what is trying to emerge in them. Name what you see. Call it real.",
    journalPrompt: 'What is trying to emerge in me that I keep fighting?',
    closingText: "The imaginal cells were attacked.\n\nAnd they won.\n\n—\n\nWhat is trying to become in you is not the enemy.\n\nIt is the whole point.",
    published: true,
  },
  {
    dayNumber: 15,
    phase: 'EGG',
    title: 'Begin Anyway',
    lie: 'I cannot begin until I feel ready.',
    truth: 'Beginning is how readiness is born.',
    body: `You have arrived at the end of Ring 1.

Fifteen days.

You came when you didn't feel like it.

You stayed when it would have been easier to stop.

You sat with words that named things you had never said out loud.

—

Some of what you read landed.

Some of it didn't — not yet.

That is fine.

The field does not absorb every rain immediately.

Some water has to sit before it sinks.

—

But we want to name something before Ring 2 begins:

You are still here.

That is not a small thing.

—

For fifteen days, something in you was told:

You don't matter. Nothing you do matters. You are alone. You are what was done to you. You don't belong. It's too late. You don't know who you are. Nobody came. You have to hide to survive. Your pain makes you weak. You're too damaged to grow. Nobody sees you. There is nothing good in you. The part of you trying to become is the enemy. You cannot begin until you are ready.

—

And you are still here.

Still reading.

Still trying.

—

That is not nothing.

That is the beginning.

You were never waiting to be ready.

You were becoming ready by staying.

Now — begin anyway.`,
    daddyManism: 'Readiness nuh come before di beginning. It come from it.',
    reflectionPrompt: 'What have you been waiting to feel before you allow yourself to begin? Name the feeling. Now ask: what if beginning is the only way to feel it?',
    challengePrompt: 'Begin one thing today that you have been waiting to feel ready for. One step. Not the whole journey. The step you have been standing in front of, waiting for permission. You have it.',
    livityPrompt: 'Tell one person who is waiting for readiness that they are already ready enough. Not to push them. To free them.',
    journalPrompt: 'What have I been waiting for permission to begin?',
    closingText: "You made it through Ring 1.\n\nFifteen days.\n\nFifteen lies.\n\n—\n\nYou were never waiting to be ready.\n\nYou were becoming ready by staying.\n\nBegin.",
    published: true,
  },

  // ── RING 2 — RELATIONAL LIES (Days 16–40) ────────────────────────────────
  // Theme: "Can anyone be trusted with the real me?"

  {
    dayNumber: 16,
    phase: 'EGG',
    title: 'Some Stay',
    lie: 'No one stays.',
    truth: 'Some people leave. That does not mean everyone will.',
    body: `You have watched them go.

One by one or all at once — it doesn't matter.

What matters is the pattern you drew from it:

Nobody stays.

—

That pattern is understandable.

If every person you trusted eventually left, the logical conclusion is that everyone leaves.

The pattern isn't irrational. It is built on real evidence.

—

But the pattern has a flaw.

It is a conclusion drawn from the people who left.

It says nothing about the people who haven't come yet.

It says nothing about the ones already beside you that you have not allowed close enough to prove themselves.

—

Some people leave because they were supposed to.

They were not built for the long road. They were built for a season.

Their leaving was not a verdict on you.

It was a completion — theirs, not yours.

—

And some people stay.

Not because they haven't had the chance to leave.

Because they chose not to.

Because you are worth staying for.

You have not met all of them yet.

But they exist.

And the belief that nobody stays is the very thing that prevents them from getting close enough to prove it.`,
    daddyManism: 'Not everybody who leave was supposed to stay. And not everybody who stay has gone yet.',
    reflectionPrompt: 'Who left that you drew the biggest conclusion from? And have you let that one departure become the rule for everyone who came after?',
    challengePrompt: "Identify one person in your life who has shown up consistently — even in small ways. Let yourself acknowledge that they are still here. Write down one specific thing they did that proved it. Don't dismiss it.",
    livityPrompt: 'Stay for someone today who might be waiting to see if you will. Not in a grand gesture. Just — be there. Follow up. Show up. Let them feel that you are not going anywhere.',
    journalPrompt: 'Who has stayed that I have not fully let myself see?',
    closingText: "Some people leave.\n\nThat is true.\n\n—\n\nBut the field is still here.\n\nAnd some of what was planted in it never left.\n\nLook again.",
    published: true,
  },
  {
    dayNumber: 17,
    phase: 'EGG',
    title: 'Ask',
    lie: 'Asking for help is weakness.',
    truth: 'Asking for help is how the field starts tending you.',
    body: `You have been carrying this alone for a long time.

Not because no one offered.

Because you wouldn't let them.

Because somewhere you learned that needing help was the same as being helpless.

That asking was the same as admitting you couldn't handle it.

That independence was the thing that proved you were worth something.

—

But independence is not strength.

Self-sufficiency taken too far is isolation wearing a better name.

—

The strongest fields are not the ones that receive no rain.

They are the ones that know how to receive it.

The ones that have been tended — by hands other than their own.

—

Asking for help does not mean you are drowning.

It means you understand something the person who never asks doesn't:

That you were not built to carry everything alone.

That the people around you are part of your ecosystem.

That receiving is not the opposite of strength.

It is one of its forms.

—

You do not have to ask for everything.

But ask for something.

Let one person in.

Let them tend something that has been untended too long.`,
    daddyManism: 'Di strong tree nuh refuse di rain. It know di rain is why it tall.',
    reflectionPrompt: 'What have you been carrying alone that you could have asked for help with? What stopped you? Name the belief underneath the refusal.',
    challengePrompt: 'Ask for help with one thing today. It does not have to be the big thing. It does not have to be from the most important person. Just ask. Notice what happens in you when you do.',
    livityPrompt: 'Make it easy for someone to ask you for help today. Lower the barrier. Let them know, in some way, that asking you is safe. Be the proof that receiving is not weakness.',
    journalPrompt: 'What would I ask for if I believed asking was allowed?',
    closingText: "You were not built to carry this alone.\n\nNobody was.\n\n—\n\nThe field that receives tending grows taller than the one that refuses it.\n\nLet someone in.",
    published: true,
  },
  {
    dayNumber: 18,
    phase: 'EGG',
    title: 'Safe Hands',
    lie: 'Vulnerability destroys you.',
    truth: 'Vulnerability with the wrong person wounds. With the right person, it heals.',
    body: `You have been open before.

And it cost you.

You showed someone something real — something unguarded — and they used it against you.

Or they left.

Or they looked at you differently afterward.

And you drew the correct conclusion from that experience:

Being open is dangerous.

—

You were right.

With that person, it was.

—

But the conclusion got wider than the evidence.

It moved from: that person could not be trusted with what I showed them

to: no person can be trusted with anything real about me.

—

That is where the lie lives.

Not in the wound — the wound was real.

In the generalization.

—

Vulnerability is not the variable.

The hands you put it in are.

—

Reckless vulnerability — showing everything to everyone, using openness as performance — that is not connection. That is something else.

But careful vulnerability. Chosen vulnerability. The kind that reads the room and reads the person and still decides:

this one.

This one I will let see something true.

—

That kind of vulnerability does not destroy you.

It is how you find the people who can hold what you are.`,
    daddyManism: 'Nuh blame di openness. Blame di wrong hands. Di right hands was always di answer.',
    reflectionPrompt: 'Who taught you that vulnerability was dangerous? Was it one person, one moment, one pattern? And have you applied that lesson to everyone since?',
    challengePrompt: "Identify one person in your life who has earned a degree of trust — someone who has shown they can hold something carefully. Share one true thing with them today. Not the deepest thing. One real thing.",
    livityPrompt: 'Be safe hands for someone today. Let them share something with you — and hold it like it matters. Do not fix it, minimize it, or share it. Just receive it and honor it.',
    journalPrompt: 'Who in my life might be safe enough to let see something real?',
    closingText: "The wound was real.\n\nAnd the hands that made it are not the only hands there are.\n\n—\n\nSomewhere there are hands that will hold what you are\nwithout dropping it.\n\nStart looking.",
    published: true,
  },
  {
    dayNumber: 19,
    phase: 'EGG',
    title: 'Not Wages',
    lie: 'Love must be earned.',
    truth: 'Real love is not wages.',
    body: `You have been working for it.

Behaving your way toward it.

Being good enough, useful enough, easy enough, low-maintenance enough.

Performing the version of yourself most likely to be loved in return.

—

And somewhere in all that performing, you lost track of the question:

Is this real?

Or is this a transaction?

—

Because transactional love exists.

It is common.

It says: I will love you as long as you behave in certain ways.

As long as you produce. As long as you don't need too much. As long as you stay useful.

—

But that is not love.

That is wages.

And wages can be docked.

Wages can be withheld.

Wages run out when the work stops.

—

Real love is not a payment for services rendered.

It is not contingent on your performance.

It does not require you to earn it on Tuesday to keep it on Wednesday.

—

You have been working for something you were supposed to simply receive.

And the exhaustion you feel is not weakness.

It is the cost of performing love

instead of being in it.`,
    daddyManism: "Love weh yuh haffi earn every day isn't love. A employment.",
    reflectionPrompt: 'Where are you performing in order to keep love — from a partner, a parent, a friend, God? What behavior are you afraid to stop in case the love stops with it?',
    challengePrompt: "Do one thing today not to earn love but to express it — freely, with no expectation of return. Notice how different it feels to give without the ledger open.",
    livityPrompt: 'Love someone today with no agenda. Not to earn something back. Not to be seen doing it. Just because they exist and you can. Let that be enough.',
    journalPrompt: 'What would I stop doing if I believed love was not something I had to earn?',
    closingText: "You were not supposed to work for this.\n\n—\n\nThe field does not earn the rain.\n\nIt receives it.\n\nAnd grows.",
    published: true,
  },
  {
    dayNumber: 20,
    phase: 'EGG',
    title: 'More Than Useful',
    lie: 'People only value what I can provide.',
    truth: 'Your usefulness is not your worth.',
    body: `You have been useful for a long time.

Reliable. Available. The one people call when they need something.

And somewhere in all that usefulness, you made a deal with yourself:

If I stay useful, I will stay valued.

If I keep providing, I will keep belonging.

—

So you kept providing.

You gave when you were empty.

You showed up when you were already carrying too much.

You said yes when every part of you wanted to say no.

Because the alternative — not being useful — felt like disappearing.

—

But here is what nobody told you:

There is a version of you that has nothing to offer right now.

No resources. No solutions. No energy to give.

Just — you.

And that version of you still has worth.

—

Not because of what you produce.

Not because of what you provide.

Because you exist.

Because you are a person, not a function.

—

The people who only value what you can give are not wrong to take it.

But they are not seeing you.

And you deserve to be seen by people who would stay

even if you had nothing left to give.`,
    daddyManism: 'Yuh worth more dan what yuh carry. Stop letting people only see di load.',
    reflectionPrompt: 'Where have you made yourself useful in order to feel valued? What are you afraid would happen to those relationships if you stopped providing?',
    challengePrompt: "Say no to one request today that you would normally say yes to out of obligation. Not to be difficult. To practice the truth that you are allowed to have limits and still be worth loving.",
    livityPrompt: "Serve someone today from a place of genuine want — not obligation. Notice the difference between giving freely and giving to earn your place. Let the first one remind you what it's supposed to feel like.",
    journalPrompt: 'Who in my life would stay if I had nothing left to give?',
    closingText: "You are not a function.\n\nYou are a person.\n\n—\n\nThe field has worth in winter\nwhen it produces nothing.\n\nSo do you.",
    published: true,
  },
  {
    dayNumber: 21,
    phase: 'EGG',
    title: 'Wise Trust',
    lie: 'If I trust, I will be betrayed.',
    truth: 'Trust requires wisdom, not total refusal.',
    body: `You have been betrayed.

Maybe more than once.

And the lesson you drew from it was reasonable:

If I trust, I get hurt.

Therefore: don't trust.

—

But there is a difference between a lesson and a life sentence.

The lesson is true — careless trust costs you.

The life sentence is different: trust no one, ever, with anything real.

—

That sentence protects you.

But it also keeps you in solitary confinement.

It keeps the people who could be trusted — the careful ones, the consistent ones, the ones who have earned it slowly — at the same distance as the ones who hurt you.

—

Trust is not binary.

It is not all-or-nothing, full-surrender or full-shutdown.

It is a practice.

It is calibrated.

It is given in increments, watched over time, extended as it is honored.

—

Wisdom does not say: trust everyone.

Wisdom does not say: trust no one.

Wisdom watches. Wisdom waits. Wisdom reads the pattern.

And when the pattern holds —

wisdom opens the door.

Not all the way.

Enough.`,
    daddyManism: 'Nuh stop trusting. Learn who deserve it. Dat is not di same thing.',
    reflectionPrompt: 'Who taught you that trust always ends in betrayal? Was that person the whole story, or just one chapter you let write the whole book?',
    challengePrompt: 'Extend one small act of trust today to someone who has earned it slowly and quietly. Not a leap — a step. Notice whether the ground holds.',
    livityPrompt: 'Be someone worthy of trust today. Do what you said you would. Show up when you said you would. Let your word be the thing someone can lean on.',
    journalPrompt: 'Who in my life has been consistent enough to deserve more trust than I have given them?',
    closingText: "Trust is not the enemy.\n\nCarelessness is.\n\n—\n\nLearn the difference.\n\nThen open the door — just enough\nto let the right ones in.",
    published: true,
  },
  {
    dayNumber: 22,
    phase: 'EGG',
    title: 'Not Alone',
    lie: 'I must carry everything alone.',
    truth: 'Some burdens were never meant for one back.',
    body: `There is a specific kind of pride that looks like strength.

It refuses help.

It minimizes struggle.

It says: I'm fine, I've got it, don't worry about me.

And it carries everything alone until it breaks.

—

You know this kind of pride.

You may live inside it.

—

The question is not whether you can carry it alone.

You probably can.

You have been doing it long enough.

The question is whether you were supposed to.

—

The heaviest things were not designed for one person.

Some weight is relational — it needs two sides to hold it without deforming what's between them.

Some weight is historical — it needs to be witnessed to be released.

Some weight is simply too much — and the person who insists on carrying it alone is not strong.

They are proud in a way that costs them more than they know.

—

Letting someone carry with you is not weakness.

It is an act of trust.

It says: I believe you can handle what I am carrying.

And sometimes — the moment you say that —

the weight changes.

Not because it got lighter.

Because it is finally shared.`,
    daddyManism: 'Even di strongest back was not built fi carry everything. Dat is why we have each other.',
    reflectionPrompt: 'What are you carrying right now that you have refused to share? What would it cost you to let someone hold part of it?',
    challengePrompt: "Tell one person today about one real thing you are carrying. Not to fix it — just to say it out loud to someone. Notice what shifts when the weight becomes shared.",
    livityPrompt: "Offer to carry something for someone today — not a metaphor, though that too. Literally help with something that is heavy for them. Show up for the weight.",
    journalPrompt: 'What am I carrying alone that was never meant for one person?',
    closingText: "You were not built to carry this alone.\n\nThe burden was too big for one back from the beginning.\n\n—\n\nLet someone in.\n\nThe load doesn't disappear.\n\nBut shared weight moves differently.",
    published: true,
  },
  {
    dayNumber: 23,
    phase: 'EGG',
    title: 'Let Truth Find Them',
    lie: 'If people know the truth, they will leave.',
    truth: 'The right people need truth to find you.',
    body: `You have been careful about what you show.

Careful about which version of yourself people meet.

The edited version. The capable version. The version that doesn't have the parts that might push them away.

—

And it has worked.

The people around you like the version you've shown them.

—

But here is the problem:

They like a version of you that isn't fully real.

Which means the acceptance you feel — the connection, the belonging — is built on something partial.

And somewhere underneath the warmth of being liked,

there is a quiet terror:

if they knew the rest, they'd go.

—

So you keep editing.

And the connection gets shallower even as it gets longer.

—

But consider this:

The people who leave when they see the truth were never staying.

They were staying for the performance.

And their leaving — as painful as it is — is a service.

It clears the room.

—

The people who stay when they see the truth —

those are your people.

You cannot find them while you're hiding.

The truth is not what drives them away.

The truth is how they find you.`,
    daddyManism: "Dem can't find yuh if yuh nuh deh deh. Show up. Di right ones will stay.",
    reflectionPrompt: 'What part of your truth are you hiding to keep people close? And is the closeness you feel real — or is it closeness to the version of you that you perform?',
    challengePrompt: "Let one true thing show today — something you would normally hide. Not a confession. Just a moment of being less edited. Notice who responds to it and how.",
    livityPrompt: "Create space for someone else's truth today. Ask a question that invites honesty. Make it clear that what they share won't change how you see them. Then prove it.",
    journalPrompt: 'What truth about me, if known, would actually bring the right people closer?',
    closingText: "The performance keeps people near.\n\nThe truth keeps the right ones.\n\n—\n\nStop editing.\n\nLet the ones who stay for the real thing\nfind where you actually are.",
    published: true,
  },
  {
    dayNumber: 24,
    phase: 'EGG',
    title: 'Feeling Again',
    lie: 'I am safer numb.',
    truth: 'Numbness protects. It also imprisons.',
    body: `You learned to go numb for good reasons.

Feeling was too expensive.

The pain was too frequent, or too sharp, or arrived before you were old enough to have somewhere to put it.

So you found the switch.

And you turned it down.

And it worked.

—

Numbness is efficient.

It keeps you functioning when feeling would stop you.

It keeps the peace when emotion would make things worse.

It lets you move through rooms that would otherwise be unbearable.

—

But numbness is not a tool you pick up and put down.

It is not surgical.

When you numb the pain, you also numb the rest.

The joy. The wonder. The love that wants to land somewhere in you but has nowhere to go.

The numbness that saved you from the worst

is also blocking the best.

—

You are safer numb.

That is true.

And you are also less.

Less alive. Less present. Less able to feel the things that make being here worth it.

—

Feeling again is terrifying.

We are not asking you to feel everything at once.

We are asking you to crack the door.

Let a little in.

See what comes through first.`,
    daddyManism: 'When yuh numb di pain, yuh numb di joy too. Yuh cyan have one without di other.',
    reflectionPrompt: 'When did you learn to go numb? What was happening that made feeling too dangerous? And what has staying numb cost you since?',
    challengePrompt: 'Allow yourself to feel one thing fully today — one small, manageable thing. Joy, gratitude, beauty, even mild sadness. Do not push it away. Let it move through you completely.',
    livityPrompt: 'Help someone feel something good today. Not manufactured emotion — a genuine moment of beauty, laughter, or warmth. Be the thing that cracks their door a little.',
    journalPrompt: 'What have I stopped feeling that I miss feeling?',
    closingText: "The numbness kept you safe.\n\nAnd it cost you.\n\n—\n\nCrack the door.\n\nNot all the way.\n\nJust enough to remember\nwhat it felt like to be here.",
    published: true,
  },
  {
    dayNumber: 25,
    phase: 'EGG',
    title: 'Guard and Builder',
    lie: 'My anger is my only protection.',
    truth: 'Anger may guard the gate. It cannot build the house.',
    body: `Your anger is not the enemy.

Before we go any further — say that to yourself.

Your anger is not the enemy.

It arrived for good reasons.

It stood between you and things that would have broken you.

It said: no further. It said: I will not be treated this way. It said: I am still here.

Anger, in that form, is a form of self-respect.

—

But anger has a range.

At one end: the righteous kind — the one that draws the line, refuses the violation, protects what matters.

At the other end: the kind that has been running so long it has become the whole personality.

The kind that scans every room for threat.

The kind that reaches for the gate before anyone has even tried to come in.

—

That kind of anger thinks it is protecting you.

And it is — from connection, from intimacy, from the vulnerability that healing requires.

—

The gate is necessary.

But a gate is not a home.

You cannot live at the gate.

—

Anger can guard what matters.

But it cannot build what you need.

For that, you need something anger cannot offer:

the willingness to put the weapon down

and trust that you are safe enough

to build.`,
    daddyManism: 'Anger is a good guard. A terrible architect. Know which one yuh need right now.',
    reflectionPrompt: 'Where is your anger standing guard over something that no longer needs that level of protection? What is it keeping out that you actually want in?',
    challengePrompt: "In one interaction today, notice the moment anger starts to rise as a reflex. Pause before it takes over. Ask: is this a real threat, or a familiar pattern? Then respond to what's actually happening.",
    livityPrompt: 'Approach someone today with patience you normally would not offer. Not because they deserve it automatically — but because you are choosing who you want to be in this moment.',
    journalPrompt: 'What is my anger protecting me from that I actually want to have?',
    closingText: "Your anger kept you alive.\n\nHonor it for that.\n\n—\n\nAnd then ask it to step aside\nlong enough for you to build something\nthe gate was always meant to protect.",
    published: true,
  },
  {
    dayNumber: 26,
    phase: 'EGG',
    title: 'Truthful Forgiveness',
    lie: 'Forgiveness means pretending it did not happen.',
    truth: 'Forgiveness tells the truth without letting the wound rule forever.',
    body: `Someone hurt you.

And someone — maybe many people — have told you that you should forgive them.

Move on. Let it go. Don't carry bitterness.

And underneath that advice, implied but rarely said:

act like it didn't happen.

Pretend. Minimize. Make peace by making the wound smaller than it was.

—

That is not forgiveness.

That is suppression wearing forgiveness as a disguise.

—

Real forgiveness does not require you to minimize.

It does not require you to pretend the wound was smaller than it was.

It does not require you to reconcile with the person who hurt you, or trust them again, or let them back into proximity with anything you care about.

—

Real forgiveness is a decision you make for yourself.

Not for them.

It says: what happened was real and it was wrong —

and I am choosing not to let it have the final word over how I live.

—

The wound gets to be exactly as big as it was.

The anger gets to be exactly as real as it is.

And you still get to choose:

this will not be the thing that runs me.

—

That is forgiveness.

Not erasure.

Liberation.`,
    daddyManism: 'Forgiveness nuh mean yuh forget. It mean yuh refuse to let it be di boss of yuh life.',
    reflectionPrompt: 'Is there something you have been told to forgive but have only been suppressing? What would it look like to tell the full truth about the wound — and still choose not to be ruled by it?',
    challengePrompt: "Write down what actually happened — the full, unminimized version. No softening. Let it be as big as it was. Then write one sentence: \"This happened. And I am choosing not to let it run me.\" That is the beginning of real forgiveness.",
    livityPrompt: 'Support someone today in their real grief — without rushing them toward forgiveness. Let the wound be real. That is the only ground real forgiveness can grow from.',
    journalPrompt: 'What have I been told to forgive that I have only been hiding?',
    closingText: "The wound was real.\n\nYou don't have to pretend otherwise.\n\n—\n\nForgiveness is not a smaller truth.\n\nIt is a bigger freedom.\n\nBegin there.",
    published: true,
  },
  {
    dayNumber: 27,
    phase: 'EGG',
    title: 'Clean Hands',
    lie: 'Apology makes me small.',
    truth: 'Apology is strength kneeling without disappearing.',
    body: `You have hurt someone.

You know it.

And somewhere between knowing it and saying it — there is a wall.

Pride, maybe. Or fear. Or the belief that admitting wrong means surrendering something you can't get back.

—

So you haven't said it.

Or you said something that sounded like it: "I'm sorry you feel that way." "I'm sorry if that came across wrong."

Which is not an apology.

It is a defense wearing an apology's clothes.

—

A real apology is harder.

It says: I did this. Not the circumstance, not you, not the misunderstanding. I did this. And it caused harm. And I am sorry.

—

That takes more strength than silence.

Silence is easy.

Silence keeps the armor on.

—

The person who can look at what they did, name it clearly, and offer a real account of it —

that person is not small.

That person has learned something most people never do:

that accountability does not diminish you.

It is the only thing that actually cleans the hands.

—

And clean hands can build.

Dirty hands only build more of what needs to be apologized for later.`,
    daddyManism: 'Real sorry nuh mek yuh small. It mek yuh clean. And clean hands build better.',
    reflectionPrompt: 'Who are you carrying an unspoken apology toward? What has kept you from saying it? Name the thing underneath the silence.',
    challengePrompt: "Offer one real apology today — to someone you have wronged, or to yourself for something you've been carrying guilt about. No qualifications. No 'but.' Just: I did this. I am sorry.",
    livityPrompt: "Make it easier for someone to apologize to you today. Receive it fully if it comes. Don't make them earn your acceptance of it. Let it be enough.",
    journalPrompt: 'What do I need to apologize for that I have been avoiding?',
    closingText: "The apology you owe is not weakness.\n\nIt is the only door back to your own integrity.\n\n—\n\nSay it.\n\nAnd mean it.\n\nAnd then build with clean hands.",
    published: true,
  },
  {
    dayNumber: 28,
    phase: 'EGG',
    title: 'Human Need',
    lie: 'If I need people, I am weak.',
    truth: 'Need is human. Dependency is not destiny.',
    body: `You were told, somewhere, that needing people was a liability.

That self-sufficiency was the goal.

That the strongest version of you was the one who required nothing from anyone.

—

And so you built yourself toward that.

You learned to want less.

To ask less.

To make do with whatever you could produce on your own.

—

And you are good at it.

You are very good at it.

—

But here is what the self-sufficiency project costs you:

Real intimacy requires need.

Not manufactured need. Not performance of vulnerability.

The actual, honest acknowledgment that you are a person who requires other people.

That you are built for connection the way a lung is built for air.

—

Needing people is not weakness.

It is the most human thing there is.

Every person you have ever admired needed people.

Every person who has done anything worth doing was held up, at some point, by someone else.

—

The lie is not that you need people.

The lie is that needing them makes you less.

It doesn't.

It makes you honest.

And honesty is the beginning of real connection.`,
    daddyManism: "Yuh need people. Dat nuh make yuh weak. It mek yuh human. Stop fighting it.",
    reflectionPrompt: 'Where did you learn that needing people was dangerous or shameful? And what has it cost you to keep proving you don\'t need anyone?',
    challengePrompt: 'Let yourself need something from someone today. Not a crisis — something small. Ask for company, for input, for help with a decision. Let the need be real and the asking be honest.',
    livityPrompt: "Let someone know you need them today. Not in a way that burdens them — in a way that honors them. 'I'm glad you're here.' 'I needed this.' Let them feel that they matter to you.",
    journalPrompt: 'What do I actually need from people that I have been pretending I don\'t?',
    closingText: "You need people.\n\nThat is not a flaw.\n\nThat is the design.\n\n—\n\nStop fighting the blueprint.\n\nYou were built for this.",
    published: true,
  },
  {
    dayNumber: 29,
    phase: 'EGG',
    title: 'Soft Strength',
    lie: 'I must become hard to survive.',
    truth: 'Soft does not mean defenseless.',
    body: `Somewhere along the way you decided:

If I stay soft, I will keep getting hurt.

If I let things affect me, I will be destroyed by them.

If I care too much, I will lose too much.

So you hardened.

Not all at once — gradually.

A little more after this. A little more after that.

Until the hardness felt like safety.

Until the hardness started to feel like you.

—

But there is a cost to hardness.

The same shell that keeps the pain out keeps everything else out too.

The love. The surprise. The grief that needs to move through you to let you grow.

The moments of genuine beauty that require you to be permeable.

—

Hard is not strong.

Hard is defended.

There is a difference.

—

The strongest things in nature are not the hardest.

Water is soft. Water carves canyons.

Roots are soft. Roots split stone.

The reed bends in the storm. The oak breaks.

—

Softness is not defenselessness.

It is adaptability.

It is the capacity to be moved without being destroyed.

It is the proof that you are still alive inside the life you are living.`,
    daddyManism: 'Water soft. Water carve di stone. Nuh confuse hardness wid strength.',
    reflectionPrompt: 'Where did you harden yourself that you wish you hadn\'t? What softness did you protect by becoming hard — and what did you lose in the process?',
    challengePrompt: 'Let something affect you today that you would normally deflect. A kind word. A beautiful thing. A moment that deserves more than a nod. Let it land. See what happens.',
    livityPrompt: "Be soft with someone today who might be used to hardness from you. Not weakness — gentleness. Not agreement — warmth. Let them feel the difference.",
    journalPrompt: 'What would become possible in me if I stopped equating softness with weakness?',
    closingText: "The hardness was protection.\n\nAnd it kept you from being held.\n\n—\n\nSoft is not small.\n\nSoft is how the root finds the crack in the stone\nand grows anyway.",
    published: true,
  },
  {
    dayNumber: 30,
    phase: 'EGG',
    title: 'Honor the Weight',
    lie: 'Nobody can understand me.',
    truth: 'Someone does not need your exact wound to honor its weight.',
    body: `You have tried to explain it before.

And they nodded.

But you could tell they didn't get it.

They understood the words but not the weight.

They knew what happened but not what it cost.

And so you stopped trying.

And you decided: nobody can understand this.

Nobody can understand me.

—

That conclusion is partly right.

Your specific wound, in its specific weight, in its specific combination — no one else carries exactly that.

You are right about that.

—

But understanding does not require identical experience.

—

The person who has never lost a child can still grieve with you.

The person who was never abandoned can still sit inside your loneliness without flinching.

The person whose damage looks nothing like yours can still say: that is heavy. I can feel that it is heavy. I will not ask you to carry it alone.

—

What you need is not someone who has the same wound.

What you need is someone with the capacity to honor what yours weighs.

—

Those people exist.

You may not have found them yet.

But their inability to fully understand

is not the same as their inability to stand with you inside it.`,
    daddyManism: "Yuh nuh need dem fi carry di same wound. Yuh need dem fi know di weight is real.",
    reflectionPrompt: 'Who have you written off as unable to understand you? Is it possible that what you needed was not understanding — but presence? And did you give them the chance to offer that?',
    challengePrompt: "Tell someone today about something hard — not expecting them to fully understand, but giving them the chance to honor the weight. See if they can be present without needing to fix or fully comprehend.",
    livityPrompt: 'Honor someone\'s weight today without needing to understand it fully. You don\'t have to have been through what they\'ve been through. You just have to be willing to sit in it with them.',
    journalPrompt: 'Who in my life has tried to be present with me that I have not let close enough because they couldn\'t fully understand?',
    closingText: "You don't need to be fully understood.\n\nYou need to be honestly held.\n\n—\n\nThose are different things.\n\nAnd the second one\nis closer than you think.",
    published: true,
  },
  {
    dayNumber: 31,
    phase: 'EGG',
    title: "Not Yours to Carry",
    lie: "I am responsible for everyone's feelings.",
    truth: 'Care is not control.',
    body: `You have been managing people's emotions for a long time.

Watching the room. Reading the temperature. Adjusting yourself before anyone even asks.

Making sure nobody is uncomfortable, nobody is upset, nobody leaves the conversation having felt something they didn't want to feel.

—

You are very good at it.

And it is exhausting you.

—

Here is what nobody told you:

Other people's feelings are not your responsibility to prevent.

You are responsible for how you treat people.

You are not responsible for how they feel about being treated well.

—

Those are different things.

Confusing them is what turns care into control.

Because when you make yourself responsible for other people's emotional states,

you don't stop at caring for them.

You start managing them.

Shrinking yourself so they stay comfortable.

Withholding truth so they stay calm.

Making yourself smaller so their feelings stay manageable.

—

That is not love.

That is self-erasure wearing love's name.

—

You can care deeply about how someone feels.

You can be thoughtful about how you act.

And you can let them be responsible for the rest.

That is not cruelty.

That is the only way to love someone without disappearing in the process.`,
    daddyManism: "Yuh responsible fi how yuh treat people. Not fi how dem feel about being treated right.",
    reflectionPrompt: "Whose emotional state have you been managing — so carefully and for so long — that you've lost track of your own? What has that cost you?",
    challengePrompt: "Let one person today feel something difficult without fixing it. Don't smooth it over. Don't apologize. Don't adjust yourself to prevent it. Just let them have their feeling while you stay present and honest.",
    livityPrompt: "Care for someone today in a way that serves them — not in a way that keeps them comfortable. Sometimes real care delivers a hard truth. Offer that instead of comfort.",
    journalPrompt: "Whose feelings am I carrying that were never mine to carry?",
    closingText: "You are not the emotional thermostat for everyone in your life.\n\n—\n\nCare for people.\n\nLet them carry what is theirs.\n\nAnd finally — carry what is yours.",
    published: true,
  },
  {
    dayNumber: 32,
    phase: 'EGG',
    title: 'Disappoint Fear',
    lie: 'I cannot disappoint anyone.',
    truth: 'Maturity sometimes disappoints people who benefited from your fear.',
    body: `There are people in your life who are comfortable with who you have been.

The version of you that doesn't push back.

The version that absorbs. That accommodates. That says yes when it means no and stays quiet when it means speak.

—

When you start to change — when you start to become someone who has limits and a voice and a self that doesn't disappear on demand —

some of those people will be disappointed.

—

They will call it selfishness.

They will call it attitude.

They will call it you changing, as if changing is the problem.

—

What they mean is: you are no longer the version of you that was convenient for them.

—

Their disappointment is real.

And it is not a verdict on whether you are doing the right thing.

—

Some disappointment is the cost of becoming.

The caterpillar, when it begins to dissolve, disappoints the form it had before.

The form had plans. The form had habits. The form was expected to keep going as it was.

—

But the butterfly does not owe the caterpillar an apology.

—

You will disappoint people as you grow.

The ones who needed you small.

The ones who benefited from your fear.

Let them be disappointed.

And keep going.`,
    daddyManism: "Some people nuh want yuh to grow. Dem want yuh to stay convenient. Disappoint dem.",
    reflectionPrompt: "Who in your life are you afraid to disappoint? Now ask: do they want what is good for you, or what is comfortable for them? Those are not always the same thing.",
    challengePrompt: "Do one thing today that serves your becoming, even if someone in your life would prefer you didn't. Not recklessly. Deliberately. Let the disappointment be the proof that you are growing.",
    livityPrompt: "Encourage someone today who is in the process of becoming — even if their becoming is inconvenient for people around them. Be the voice that says: keep going.",
    journalPrompt: "Who am I staying small to keep comfortable? And what is that costing me?",
    closingText: "You will disappoint people as you grow.\n\nThe ones who needed you small.\n\n—\n\nLet them be disappointed.\n\nThe field does not apologize for the harvest.",
    published: true,
  },
  {
    dayNumber: 33,
    phase: 'EGG',
    title: 'The Line',
    lie: 'Boundaries are rejection.',
    truth: 'Boundaries are how love survives without becoming ownership.',
    body: `When you draw a line, some people feel rejected.

They experience your limit as a refusal of them.

Your no as a no to their worth.

Your boundary as a wall instead of a door.

—

And if you grew up in a place without healthy limits — where love and control were the same thing — that interpretation makes sense.

In that world, love was supposed to be boundless.

Limitless.

The person who loved you had no edges.

And so edges feel like unlove.

—

But edges are not unlove.

Edges are what make love possible without it consuming one of you.

—

A river without banks is not a river.

It is a flood.

It covers everything.

It destroys what it was meant to nourish.

—

A boundary is a bank.

It gives the love shape.

It gives it direction.

It makes it possible for two people to exist in relationship without one of them disappearing.

—

You are not rejecting someone when you tell them what you need.

You are telling them what they need to know

to love you in a way that works.

—

The boundary is not the end of the relationship.

It is the thing that makes it possible

to keep going.`,
    daddyManism: 'A river wid no banks is just a flood. Di banks is what mek it a river.',
    reflectionPrompt: "Where have you experienced someone else's boundary as rejection? And where have you refused to draw a line because you were afraid of what it would mean to them?",
    challengePrompt: "Name one limit you have needed to draw that you have been afraid to draw. Write it down clearly: what you need, and why. You don't have to say it today. But write it as if you will.",
    livityPrompt: "Respect someone's boundary today without making them justify it. Let their no be enough. Let their limit be honored without negotiation. That is one of the most loving things you can do.",
    journalPrompt: "What line do I need to draw that I have been too afraid to draw?",
    closingText: "The boundary is not rejection.\n\nIt is the shape of something real.\n\n—\n\nDraw the line.\n\nAnd let love have room\nto be what it was always meant to be.",
    published: true,
  },
  {
    dayNumber: 34,
    phase: 'EGG',
    title: 'Holy No',
    lie: 'If I say no, I am bad.',
    truth: 'A righteous no can protect a holy yes.',
    body: `You have been saying yes when you meant no for a long time.

To keep the peace.

To avoid the guilt.

To hold on to the version of yourself that people find easy to love.

—

And every yes that was really a no

has cost you something.

Your time. Your energy. Your sense of yourself.

The slow erosion of knowing what you actually want.

—

The no you are afraid to say is not cruelty.

It is a door.

On the other side of a righteous no

is everything you would have said yes to

if you hadn't used that yes on the wrong thing.

—

The person who can say no

protects what matters.

They are not withholding.

They are guarding.

—

You cannot say a full yes

when you have no nos left.

You cannot give fully

when you have given everything to things you should have declined.

—

A holy yes is not just saying yes.

It is saying yes to the right thing.

With your full self behind it.

With nothing taken.

With nothing obligated.

With nothing remaining but choice.

—

That kind of yes is only possible

because of the nos that protected it.`,
    daddyManism: "Di 'no' yuh afraid fi say is guarding di 'yes' yuh actually mean.",
    reflectionPrompt: "What yes in your life is actually a no that you have been afraid to say? What would happen if you said the truth?",
    challengePrompt: "Say no to one thing today that you would normally say yes to out of guilt or obligation. Not aggressively — clearly. 'I can't do that.' Or simply: 'No.' Notice the ground doesn't open up.",
    livityPrompt: "Free someone today from an obligation they are keeping out of fear. Make it easy for them to say no to you. Give them the gift of an honest no being enough.",
    journalPrompt: "What holy yes is waiting on the other side of a no I haven't said yet?",
    closingText: "Every righteous no\nis a door.\n\n—\n\nOn the other side:\nthe yes you actually meant.\n\nThe thing worth giving everything to.\n\nSay no.\n\nAnd find it.",
    published: true,
  },
  {
    dayNumber: 35,
    phase: 'EGG',
    title: 'Not the Owner',
    lie: 'I must fix everyone to be good.',
    truth: 'Tending the field does not mean owning every seed.',
    body: `You care deeply.

That is real.

You see people struggling and it pulls at you.

You see the gap between who someone is and who they could be,

and something in you wants to close it.

—

So you try.

You offer. You advise. You push. You fix.

You carry concern for people's growth the way some carry debt —

heavily, always, without a clear date when it ends.

—

But here is what the compulsive fixer often misses:

People are not yours to fix.

Not your partner. Not your children. Not your closest friends.

Not even yourself, in the way you are trying.

—

The gardener tends the field.

The gardener creates conditions.

The gardener removes what chokes.

The gardener waters.

—

But the gardener does not reach into the seed

and pull the plant out.

That is not gardening.

That is destruction wearing the name of help.

—

The seed grows on its own timeline.

In its own direction.

Toward the light it finds, not the light you point to.

—

You can tend.

You can care.

You can be present for the growing.

—

But you cannot own it.

And trying to

is the surest way to break what you were trying to help.`,
    daddyManism: "Tend di garden. Yuh nuh own di seeds. Dem will grow when dem ready — not when yuh ready fi dem.",
    reflectionPrompt: "Who are you trying to fix right now? And is your fixing helping them grow, or helping you feel less anxious about their growth?",
    challengePrompt: "Choose one person you have been trying to fix. Today, do not offer advice, solutions, or gentle pressure. Just be present. Ask how they are. Listen without an agenda. See what they offer when you stop pulling.",
    livityPrompt: "Serve someone today in the way they actually need — not the way you think they need. Ask first. Then do that. Let their need lead, not yours.",
    journalPrompt: "Whose growth am I trying to control because I cannot tolerate watching them struggle?",
    closingText: "You are the gardener.\n\nNot the owner.\n\n—\n\nTend what you can.\n\nLet the seeds do what only seeds can do.\n\nAnd trust the field.",
    published: true,
  },
  {
    dayNumber: 36,
    phase: 'EGG',
    title: 'Honest Peace',
    lie: 'My silence keeps peace.',
    truth: 'Some silence only protects the poison.',
    body: `You have learned to keep quiet to keep the peace.

To swallow the thing you needed to say.

To let it pass. Let it go. Choose your battles.

And on the surface, it works.

The room stays calm.

The relationship stays intact.

Nobody has to deal with the discomfort of the truth.

—

But here is what silence actually does:

It does not remove the thing that needed to be said.

It buries it.

Alive.

—

And buried things grow in the dark.

The resentment that wasn't spoken becomes the distance that shows up years later.

The need that wasn't named becomes the wound that can't be explained.

The truth that was swallowed becomes the thing that poisons what it was trying to protect.

—

Silence is not always peace.

Sometimes silence is just the decision to let something rot quietly

instead of dealing with it in the open air.

—

Real peace is not the absence of conflict.

Real peace is the presence of honesty

after the conflict has been handled.

—

Some things have to be said

for the silence after them

to mean anything.`,
    daddyManism: "Di quiet room ain't always a peaceful room. Sometimes it's just a room full of things nobody said.",
    reflectionPrompt: 'What have you been keeping quiet to keep the peace? And what has that silence been doing to you — and to the relationship — while it sits unspoken?',
    challengePrompt: 'Say one true thing today that you have been swallowing. Not everything — one thing. The one that has been sitting heaviest. Say it clearly and without cruelty. Let it breathe.',
    livityPrompt: 'Create a space today where someone else can say the thing they have been swallowing. Ask: is there something you have needed to say? And mean it when you ask.',
    journalPrompt: 'What have I been keeping quiet that is slowly poisoning something I care about?',
    closingText: "Some silences protect.\n\nAnd some silences rot what they were meant to preserve.\n\n—\n\nLearn the difference.\n\nAnd then — say the thing.",
    published: true,
  },
  {
    dayNumber: 37,
    phase: 'EGG',
    title: "Fear's Armor",
    lie: 'I am only safe if I control everything.',
    truth: 'Control is not safety. It is fear wearing armor.',
    body: `You have been managing.

The variables. The outcomes. The other people's behavior.

Making sure everything goes the way it needs to go

so that nothing goes wrong.

—

And it is exhausting.

Because you are trying to hold something that cannot be held.

—

Control is not safety.

Control is the attempt to manufacture safety

in the absence of trust.

—

When you were young — or when something broke — you learned that the world was not safe.

That things could go wrong without warning.

That people could hurt you.

That unpredictability was dangerous.

And so you reached for the one thing that felt like protection:

control.

—

But control is a leaky container.

No matter how tightly you hold it,

something always slips through.

The thing you couldn't anticipate.

The person who wouldn't cooperate.

The outcome that refused to follow the plan.

—

And every time something slips through,

the fear gets louder.

So you tighten more.

And exhaust yourself more.

—

Real safety does not come from controlling everything.

It comes from trusting that you can handle what comes.

Even the things you didn't plan for.

Even the outcomes you didn't choose.

—

You are more capable than the fear believes.

Let something go.

See what happens.`,
    daddyManism: "Control is just fear in a suit. Tek off di suit and ask what yuh actually afraid of.",
    reflectionPrompt: 'Where in your life are you gripping hardest? And what are you actually afraid would happen if you released that grip?',
    challengePrompt: 'Let one thing today be outside your control without intervening. Watch it unfold without managing it. Notice that you survived.',
    livityPrompt: 'Give someone today the freedom to do something their way — not yours. Resist the urge to correct, advise, or steer. Let their approach be enough.',
    journalPrompt: 'What am I controlling that I need to trust instead?',
    closingText: "You cannot hold the weather.\n\nYou can learn to stand in it.\n\n—\n\nLet go of what you cannot hold.\n\nAnd discover\nwhat you were strong enough for\nall along.",
    published: true,
  },
  {
    dayNumber: 38,
    phase: 'EGG',
    title: 'Known',
    lie: 'If I let people close, they will see I am not enough.',
    truth: 'Being known is not the same as being exposed.',
    body: `You are afraid of what people would find

if they got close enough to actually see.

Not the performance. Not the capable version.

The underneath.

The places you have not finished.

The things you have done and regret.

The fears you have not shared.

The ways you are still figuring it out.

—

And so you keep a certain distance.

Close enough to feel connected.

Far enough that the real thing stays hidden.

—

But here is what that distance is costing you:

You are never fully loved.

You are liked, admired, appreciated, valued.

But the version of you they love

is the version you curated.

And somewhere in you,

you know it.

And it is lonely.

—

Being known is not the same as being exposed.

Exposure is when something is taken from you.

Being known is when something is offered.

—

The difference is who holds it, and how.

—

You do not have to show everything to everyone.

You are not required to perform full transparency for people who have not earned it.

—

But there are people in your life

who have been waiting, quietly,

for you to let them in.

Who would not use what they found against you.

Who would hold it carefully.

Who would stay.

—

Let one of them see something real.

Not to be fixed.

To be known.`,
    daddyManism: "Being known is not a threat. It's di closest thing to being loved dat actually counts.",
    reflectionPrompt: 'What are you most afraid people would find if they saw the whole of you? And is it possible that the right person — one who has earned it — could see it and stay?',
    challengePrompt: 'Let one safe person see one real thing today. Not a crisis. Something true about where you are right now. Offer it as a gift, not a confession. See how they hold it.',
    livityPrompt: 'Hold something carefully today that someone trusted you with. Do not share it. Do not minimize it. Do not try to fix it. Just be the proof that being known is safe.',
    journalPrompt: 'Who has earned the right to know me more than I have let them?',
    closingText: "You were not made to be a performance.\n\nYou were made to be known.\n\n—\n\nLet the right ones in.\n\nThe real you is not a liability.\n\nIt is the thing worth finding.",
    published: true,
  },
  {
    dayNumber: 39,
    phase: 'EGG',
    title: 'Stop the Chain',
    lie: 'I cannot heal what I inherited.',
    truth: 'What was passed down can stop with you.',
    body: `You came from something.

A family. A history. A set of patterns that were handed down

before anyone asked whether they should be.

Rage that nobody named. Silence that passed as peace. Distance that was called strength. Absence that was called providing.

—

You received it.

Not because you asked for it.

Because it was there, and you were young, and it was all you saw.

—

And now you carry it.

And you wonder, somewhere underneath the wondering:

Is this just who I am?

Is this the shape of me, passed down from them?

Am I just the next generation of this?

—

You are not.

—

Here is what is true about inherited things:

They are real.

They shaped you.

They are not nothing.

—

And they can stop with you.

—

You did not choose what you received.

You do choose what you pass on.

—

The chain does not break by pretending it isn't there.

It breaks by seeing it clearly.

By naming what it cost.

By deciding — deliberately, with your whole self —

that the thing you received

will not be the thing you give.

—

This is not easy.

It is some of the hardest work a person can do.

—

But you are the one standing at the link.

And the direction it goes from here

is yours to choose.`,
    daddyManism: "Yuh nuh choose what dem pass down. But yuh choose what yuh pass on. Dat is where di power live.",
    reflectionPrompt: 'What did you inherit that you are in danger of passing on? Not as accusation — as honest inventory. What pattern, what silence, what wound arrived before you were old enough to refuse it?',
    challengePrompt: 'Name one inherited pattern you are committed to stopping. Write it down with both parts: what was passed to you, and what you are choosing to do differently. Make it specific.',
    livityPrompt: 'Be for someone today what someone failed to be for you. Not to prove anything. Because you are the one standing at the link — and you can choose the direction.',
    journalPrompt: 'What ends with me?',
    closingText: "The chain is real.\n\nAnd it can stop.\n\n—\n\nNot because you are stronger than what came before.\n\nBecause you are willing to see it\nand choose differently.\n\nWhat ends with you\nis just as powerful as what began.",
    published: true,
  },
  {
    dayNumber: 40,
    phase: 'EGG',
    title: 'Returned',
    lie: 'Relationship always costs me myself.',
    truth: 'Healthy love returns you to yourself.',
    body: `You have arrived at the end of Ring 2.

Twenty-five days of relational lies.

Twenty-five places where the wound about other people became the rule about all people.

—

Before Ring 3 begins, we want to say something:

If relationship has always cost you yourself —

if closeness has always meant losing ground —

if love has always come with a price tag that included something essential —

that was not love.

That was something wearing love's name.

—

Real love does not require you to disappear.

Real love does not ask you to shrink to fit.

Real love does not demand that you become less

so it can become more.

—

Real love returns you to yourself.

—

It gives you back the parts of you that smaller relationships took.

It makes you more — not less — of who you actually are.

It gives you the safety to be real

and the room to become.

—

You may not have experienced that kind of love yet.

Or you may have glimpsed it.

Or it may be what you are becoming capable of giving.

—

Either way — it exists.

And it is what the field has been growing toward

this whole time.

—

You were not made to lose yourself in relationship.

You were made to find yourself

in the presence of people who could actually see you.

—

Ring 2 is complete.

You have been seen.

Now we move into the deepest ring:

Who you are.

And what you can become.`,
    daddyManism: "Real love nuh tek from yuh. It give yuh back di parts of you dat di wrong love took.",
    reflectionPrompt: 'Has there been a relationship — any relationship — where you felt more yourself, not less? What made it different? What did it ask of you that was different from what took from you?',
    challengePrompt: 'Write down three things that are true about you — not what you do, not what you provide, but who you are — that you want to carry into Ring 3. These are the parts of you that belong to you, regardless of who is watching.',
    livityPrompt: 'Be a returning presence for someone today. Not grand. Just: be the person who, when they are with you, they feel a little more like themselves. That is one of the greatest gifts one person can give another.',
    journalPrompt: 'What version of me do I want to bring into Ring 3?',
    closingText: "Ring 2 is complete.\n\nTwenty-five lies about people.\n\nTwenty-five truths about what love can actually be.\n\n—\n\nYou were not made to lose yourself.\n\nYou were made to be found.\n\nRing 3 begins now.",
    published: true,
  },

  // ── RING 3 — IDENTITY LIES (Days 41–60) ──────────────────────────────────
  // Theme: "Can someone like me actually become?"

  {
    dayNumber: 41,
    phase: 'EGG',
    title: 'Not Him',
    lie: 'I am what my father was.',
    truth: 'Inheritance is not imprisonment.',
    body: `You have looked in the mirror and seen him.

In the way you raise your voice.

In the way you go silent when it gets too heavy.

In the pattern that arrives before you can choose differently.

And somewhere in that recognition — a fear:

I am becoming him.

Or worse: I already am.

—

That fear is not nothing.

It takes something real seriously.

The patterns we inherit are powerful.

They don't ask permission before they show up.

—

But here is the distinction that matters:

Inheritance is not imprisonment.

—

What you received from him — the behaviors, the wounds, the gaps, the silences —

arrived without your consent.

You did not choose to carry it.

—

But you are not what arrived.

You are what decides what to do with what arrived.

—

He could not choose what he received.

Maybe nobody ever helped him see it.

Maybe nobody ever stood at his link and said: this can stop here.

—

You can.

—

The blood is his.

The choice is yours.

That is not a small distinction.

That is everything.`,
    daddyManism: 'Di blood is his. Di choice is yours. Dose are not di same thing.',
    reflectionPrompt: "Where have you looked at yourself and seen your father — and been afraid of what you saw? And where have you looked and seen something that is entirely your own?",
    challengePrompt: "Write down one way you are different from the version of him you are afraid of becoming. Not a performance — something real. A choice you have made that he didn't. Evidence that you are not only the inheritance.",
    livityPrompt: "Be today the father figure — the presence — that someone around you needed and didn't have. Not perfectly. Just deliberately.",
    journalPrompt: 'What did I receive that I am choosing to transform rather than repeat?',
    closingText: "You are not imprisoned by what you were handed.\n\n—\n\nThe inheritance arrives.\n\nThe choice remains yours.\n\nMake it.",
    published: true,
  },
  {
    dayNumber: 42,
    phase: 'EGG',
    title: 'Not Built Wrong',
    lie: 'I was built wrong.',
    truth: 'You may have been wounded early. You were not made wrong.',
    body: `There is a lie deeper than most.

Deeper than "I don't matter."

Deeper than "nobody stays."

It is the one that says:

I am a mistake at the level of my making.

Not just damaged — defective.

Not just hurt — fundamentally wrong.

—

If you carry that lie, you know how heavy it is.

It colors everything.

It makes the wounds feel permanent.

It makes the patterns feel like nature.

It makes becoming feel impossible

because if the flaw is in the foundation,

what is the point of building?

—

But here is the truth:

No person is manufactured broken.

—

What happened early — before you could speak, before you could choose, before you understood what was happening to you —

shaped you.

Profoundly.

It created patterns that feel like personality.

Responses that feel like character.

Wounds that feel like identity.

—

But those are not your blueprint.

Those are the marks of what the blueprint survived.

—

You were not built wrong.

You were built.

And then things happened to what was built.

And the things that happened are not the building.

—

The building is still there.

Underneath everything.

Still the original thing.

Still capable.

Still yours.`,
    daddyManism: 'Yuh nuh come out wrong. Yuh come out and di world did rough. Dose are not di same.',
    reflectionPrompt: "Where did the belief that you were fundamentally defective come from? Who said it, or what happened that made it feel true? And is it actually true — or is it the wound speaking?",
    challengePrompt: "Write down three things about yourself that are good — not despite what happened to you, but simply true. Things that exist in you that no damage created and no damage has managed to destroy.",
    livityPrompt: "Tell someone today that they are not what happened to them. Not as empty comfort. As truth you actually believe. Let them feel that the distinction is real.",
    journalPrompt: 'What is true about me that was true before anything went wrong?',
    closingText: "You were not built wrong.\n\nYou were built.\n\nAnd what was built\nis still inside the damage\nwaiting to be found.",
    published: true,
  },
  {
    dayNumber: 43,
    phase: 'EGG',
    title: 'Deep Roots',
    lie: 'The damage is too deep.',
    truth: 'Deep wounds need deep roots.',
    body: `You have looked at the damage and concluded:

This is too far down.

Too close to the center.

Too woven into the structure of me.

This is not something that heals.

This is something I manage.

—

We understand why you concluded that.

The damage is real.

And it is deep.

—

But here is something about deep things:

The deepest wounds require the deepest roots.

—

The tree that grows in the harshest ground

is not the same as the tree that grows in easy soil.

Its roots go further.

They work harder.

They find water in places other roots never reach.

—

And because of that —

it holds.

When the storm comes that would uproot the easier tree,

the tree that grew through difficulty

bends but does not break.

—

The depth of your damage is not proof that healing is impossible.

It is the exact measurement of how deep your roots need to go.

—

You do not need shallow healing for shallow wounds.

You need the kind of root system that goes all the way down

to where the wound lives

and grows right through it.

—

That kind of growth is not fast.

But it is the only kind that holds.`,
    daddyManism: 'Di deeper di wound, di deeper di root haffi go. Dat is not a curse. Dat is how di strong tree grow.',
    reflectionPrompt: 'Where have you concluded that something is too deep to heal? What would it mean to approach that place — not to fix it quickly, but to begin growing roots through it slowly?',
    challengePrompt: "Take one small step today toward something you have declared too damaged to address. Not the whole thing. One root going one inch deeper. Acknowledge the wound without declaring it permanent.",
    livityPrompt: "Sit with someone today in their deep place. Not to fix it. To be a root alongside theirs. Let your steadiness be what they feel, not your solutions.",
    journalPrompt: 'What deep thing in me is waiting not to be fixed — but to grow roots through it?',
    closingText: "The wound is deep.\n\nAnd the roots go deeper.\n\n—\n\nWhat could not break you\nis the same ground\nyour deepest growth is coming from.",
    published: true,
  },
  {
    dayNumber: 44,
    phase: 'EGG',
    title: 'Not Disqualified',
    lie: 'My past disqualifies my future.',
    truth: 'Your past is evidence, not a sentence.',
    body: `You have been reading your past like a verdict.

Like a document that was handed down and signed

and cannot be appealed.

—

It says: because of what you did, you cannot.

Because of where you have been, you are not allowed.

Because of how you have lived, the door is closed.

—

But that is not what the past is.

—

The past is evidence.

Evidence of what has been lived.

Evidence of what has been survived.

Evidence of choices made under conditions you may no longer live in.

Evidence of who you were at a cost you may now understand differently.

—

Evidence is not a sentence.

Evidence is information.

—

The same past that disqualifies you in your reading of it

is also evidence that you are still here.

That you survived things that were supposed to stop you.

That you kept going through conditions that would have broken others.

—

That is not a disqualification.

That is a testimony.

—

What you did with what you had

in the conditions you were in

does not determine what you can do now

with what you have

in the conditions you are building.

—

The case is not closed.

You have not been sentenced.

You have been given evidence.

Read it again.

This time as the prosecutor of the lie —

not the lie's defendant.`,
    daddyManism: 'Yuh past is not di verdict. It is di evidence. And di jury is still yuh.',
    reflectionPrompt: 'What has your past been used to disqualify you from — by others or by yourself? Is that disqualification a truth, or a story someone told you that you have been agreeing with?',
    challengePrompt: "Take one thing your past has told you that you cannot do or be. Write the counter-argument — the evidence from your own life that suggests the opposite. Make the case for yourself.",
    livityPrompt: "Be a character witness for someone today. Someone whose past has been used against them. Tell them what you have actually seen in them. Let your testimony carry weight.",
    journalPrompt: 'What does my past actually prove about me — when I read it as evidence instead of as a sentence?',
    closingText: "The past happened.\n\nIt is not the verdict.\n\n—\n\nYou are the jury.\n\nAnd the case for your future\nis still being made.",
    published: true,
  },
  {
    dayNumber: 45,
    phase: 'EGG',
    title: 'For You Too',
    lie: 'Transformation is for other people.',
    truth: 'The circle does not exclude you.',
    body: `You have watched other people change.

You have seen it happen.

The person who was lost and found direction.

The one who was broken and became whole.

The one who came back from something everyone said was impossible to come back from.

And somewhere in the watching,

a quiet conclusion:

That is available to them.

Not to me.

I am a different kind of case.

My situation is the exception.

—

That conclusion is the lie.

—

The transformation available to others

is not a limited resource.

It is not rationed.

It does not run out before it reaches you.

—

The circle of becoming is not a club with a selective entrance.

It does not review your history before it lets you in.

It does not weigh your damage against a threshold

and decide you are too far gone.

—

The butterfly does not choose its caterpillar.

The chrysalis does not check credentials.

The process does not care who you were

or how long you have been in the wrong form.

—

It only asks one thing:

Are you willing to enter the process?

—

The circle does not exclude you.

You exclude yourself.

—

And you can stop.

Today.`,
    daddyManism: "Di circle nuh have a 'not for you' clause. Dat clause is something yuh added yourself.",
    reflectionPrompt: 'Where do you watch transformation happening in other people and silently believe it is not available to you? What makes you the exception in your own mind?',
    challengePrompt: "Act today as if transformation is for you. Not as performance — as experiment. Make one choice you would make if you genuinely believed change was possible for someone like you. See what it feels like.",
    livityPrompt: "Tell someone today that the circle includes them. Someone who has placed themselves outside it. Not with empty encouragement — with specific evidence of why they belong in it.",
    journalPrompt: 'When did I decide I was the exception? And what would change if I decided I was not?',
    closingText: "The circle is not closed to you.\n\nIt never was.\n\n—\n\nThe only thing between you\nand what is possible\nis the story that it isn't.",
    published: true,
  },
  {
    dayNumber: 46,
    phase: 'EGG',
    title: 'Late Rain',
    lie: 'I missed my chance.',
    truth: 'The field can receive late rain.',
    body: `You have a specific loss in mind.

Not the general sense that it might be too late.

A specific moment. A specific door.

The thing you did not do when you should have done it.

The person you did not choose when they were still there to choose.

The version of yourself that was available then

and is not available anymore.

—

That loss is real.

We are not going to minimize it.

—

But there is a difference between:

I missed that chance.

And:

I have no chances left.

—

The first is grief. And grief is appropriate.

The second is a lie.

—

The field does not stop receiving rain

because the spring rain was missed.

Summer rain falls.

Autumn rain falls.

And fields that have received late rain

grow things that early-season fields do not.

Deeper. Slower. More patient. More rooted.

—

The late harvest is not the lesser harvest.

It is the harvest of something that had to wait for the right season.

—

You did not miss your chance.

You missed a chance.

The one that was available then.

—

There are others.

Different shape. Different timing.

Not the same — but real.

And the field is still open.`,
    daddyManism: 'Yuh miss di spring rain. Di summer rain still fall. Di field still open.',
    reflectionPrompt: "What specific chance do you believe you missed — and have been grieving? Is it possible that what you lost was a particular form of what you wanted, not the thing itself?",
    challengePrompt: "Look for one door today that is available now — not the door you missed, but a door that is open in this season. You do not have to walk through it. Just acknowledge it exists.",
    livityPrompt: "Be late rain for someone today. Show up for someone who has stopped expecting anyone to come. Your timing does not disqualify your arrival.",
    journalPrompt: 'What is still possible for me in this season that was not possible in the one I missed?',
    closingText: "The spring is gone.\n\nThe field is not.\n\n—\n\nLate rain is still rain.\n\nAnd what grows in it\nis yours.",
    published: true,
  },
  {
    dayNumber: 47,
    phase: 'EGG',
    title: 'Soil',
    lie: 'I must become famous to matter.',
    truth: 'Soil matters without being seen.',
    body: `Nobody celebrates the soil.

Nobody writes songs about what happens underground.

Nobody builds statues for the thing that holds the roots

while the tree gets all the attention.

—

And yet — without the soil, nothing grows.

—

The soil is not failing because nobody sees it.

The soil is not lesser because the tree gets the light.

The soil does not compare itself to the flower.

The soil knows what it is.

And it does the work that only soil can do.

—

You have been told, somewhere, that mattering requires visibility.

That significance is measured in followers, in reach, in rooms that fill because of your name.

That the unseen life is a smaller life.

—

That is not what the field teaches.

—

The most essential things in any ecosystem

are the least visible ones.

The mycelium that runs beneath the forest floor.

The earthworm turning the dark soil.

The root that finds the water nobody else reaches.

—

If you are the soil of someone's life —

if you are the steady thing they grow from —

if you hold something up that would collapse without you —

you are not small.

You are foundational.

—

Foundation does not need applause to be real.`,
    daddyManism: "Soil nuh get di glory. But nothing grow without it. Know what yuh are.",
    reflectionPrompt: "Where are you doing foundational work that nobody sees? And have you been measuring that work against a visibility standard that was never the right measure for it?",
    challengePrompt: "Do one completely unseen act of significance today. Something that helps someone grow, that nobody will attribute to you, that leaves no trace of your name. Do it fully. Notice what it costs and what it gives.",
    livityPrompt: "Be soil for someone today. Not the visible support — the invisible kind. The kind that holds them without needing to be thanked for holding.",
    journalPrompt: 'What am I holding up that would collapse if I were not there — even if nobody knows I am there?',
    closingText: "Soil does not need to be seen to be essential.\n\n—\n\nNeither do you.\n\nDo the work.\n\nThe forest knows what it is growing from.",
    published: true,
  },
  {
    dayNumber: 48,
    phase: 'EGG',
    title: 'Bigger Room',
    lie: 'Success will heal me.',
    truth: 'Success without healing only gives pain a bigger room.',
    body: `You have been chasing something.

Not just achievement — relief.

The belief that when you get there — the position, the income, the recognition —

the thing underneath will finally quiet down.

—

But here is what success actually does:

It amplifies.

—

It takes what is already there and gives it more space.

More time. More resources. More visibility.

More room.

—

If what is already there is healed — or healing — success is a gift.

It becomes fuel for the becoming.

—

If what is already there is unaddressed pain —

success gives the pain a bigger room.

A louder voice.

More ways to act itself out.

More people to affect.

More damage to leave in its wake.

—

This is why successful people can be so destructive.

Not because success is bad.

Because they brought the unaddressed things with them.

And success gave those things resources.

—

The achievement is not the healing.

The achievement is a magnifier.

—

Heal first.

Not because success is wrong.

Because you deserve to arrive at success as someone

who can actually receive it

instead of someone who uses it to run from what they haven't faced.`,
    daddyManism: 'Success wid no healing just give di pain a bigger stage. Deal wid di pain first.',
    reflectionPrompt: 'What have you been chasing that you secretly believe will heal something in you? And what would happen if you had to address that thing directly — without the achievement as the plan?',
    challengePrompt: "Identify one thing you have been using achievement to avoid. You do not have to face the whole thing today. Just name it. Say: this is what I have been running from. That naming is the beginning.",
    livityPrompt: "Be honest with someone today about the gap between where you appear to be and where you actually are. Let them see that the external and the internal are not the same. Give them permission to be honest too.",
    journalPrompt: 'What am I hoping success will heal that I actually need to address directly?',
    closingText: "The achievement is not the medicine.\n\n—\n\nHeal what needs healing.\n\nThen let the success\nbe what it was always supposed to be:\nnot the cure,\nbut the room to build in.",
    published: true,
  },
  {
    dayNumber: 49,
    phase: 'EGG',
    title: 'More Than Gifted',
    lie: 'I am only my talent.',
    truth: 'Your gift is what you carry. It is not all you are.',
    body: `You are gifted.

That is real.

Something in you does something that not everyone can do.

And the world noticed.

And the world responded.

And the world began to relate to you almost entirely through that thing.

—

And over time, you began to as well.

—

Your gift became your identity.

The thing you do became the thing you are.

And when the gift was going well, you felt like you were going well.

And when the gift struggled — or was criticized, or was ignored —

you did not feel like your work was struggling.

You felt like you were.

—

But you are not your talent.

—

Your talent is something you carry.

It is not the carrier.

—

The person who carries the gift matters more than the gift.

The quality of who you are — how you treat people, how you receive pain, what you do with failure, who you are in the quiet —

that is the substance.

The gift is what it grows in.

—

If the person is hollow, the gift becomes hollow.

If the person is deep, the gift goes deeper than talent alone could take it.

—

Tend the person.

Not just the gift.

The gift needs somewhere real to come from.`,
    daddyManism: "Yuh talent is what yuh carry. But yuh is di one doing di carrying. Don't forget which one matter more.",
    reflectionPrompt: "Who are you when you remove the gift? When the thing you are known for is not in the room — who is present? Do you know that person?",
    challengePrompt: "Spend time today doing something that has nothing to do with your gift. Something you are average at, or still learning. Let yourself be a person, not a performer. Notice what is there.",
    livityPrompt: "Engage with someone today around who they are — not what they do. Ask about their interior, not their output. Let the gift be irrelevant for this conversation.",
    journalPrompt: 'Who am I when my talent is not in the room?',
    closingText: "The gift is real.\n\nAnd you are more than it.\n\n—\n\nTend the person\nthe gift comes from.\n\nThat is the deepest work.",
    published: true,
  },
  {
    dayNumber: 50,
    phase: 'EGG',
    title: 'Molt',
    lie: 'If I fail again, that proves I am finished.',
    truth: 'Failure can be a molt, not a funeral.',
    body: `You have failed before.

And you got back up.

And it happened again.

And you got back up again.

And somewhere in the pattern of falling and rising and falling again,

the rising started to feel less certain.

And the thought arrived:

How many times can a person fall before it means something permanent?

—

There is an answer.

It is not the answer you expect.

—

The caterpillar, before it becomes a butterfly, does something called molting.

It sheds its skin.

Not once — multiple times.

Each time it outgrows the form it was in.

Each time the old skin breaks and falls away

and what is underneath is exposed —

vulnerable, soft, not yet what it will become.

—

From the outside, each molt looks like a collapse.

But from the inside, it is growth demanding more room.

—

Your failures may be molts.

—

Not proof that you are finished.

Proof that what is growing in you

has outgrown the form you were in.

—

The question is not: how many times have I fallen?

The question is: what was outgrown each time?

And what is underneath — softer, more exposed, more real —

waiting to harden into what comes next?`,
    daddyManism: 'Every molt look like a collapse from di outside. From di inside, a just room fi what coming next.',
    reflectionPrompt: "Look at your failures differently for a moment. Not as proof of a pattern, but as molts. What did each one shed? What were you outgrowing at the time you fell?",
    challengePrompt: "Name one failure you have been carrying as permanent proof of your limitations. Then write one thing it might have been clearing space for. You don't have to believe it fully. Just consider it.",
    livityPrompt: "Be present with someone in their failure today in a way that does not rush them to the lesson. Let them be in the molt without making it immediately meaningful. Presence first. Meaning later.",
    journalPrompt: 'What has each failure been making room for?',
    closingText: "You have not been failing.\n\nYou have been molting.\n\n—\n\nThe skin that fell away\nwas always too small\nfor what is coming.",
    published: true,
  },
  {
    dayNumber: 51,
    phase: 'EGG',
    title: 'No Betrayal',
    lie: 'I have to become someone else to survive.',
    truth: 'Survival should not require self-betrayal.',
    body: `You learned, somewhere, that being yourself was dangerous.

That the real version of you — unfiltered, unperformed, unmanaged —

was not safe.

So you built another version.

More palatable. More acceptable. More likely to survive the rooms you were in.

—

And it worked.

You survived.

—

But survival extracted a price you may not have named yet:

You.

—

The version that survived is not all of you.

It is the portion of you that was safe to show.

And somewhere in the years of showing only that portion,

you may have started to lose track of the rest.

—

That is the deepest cost of self-betrayal.

Not that you lied to others.

That you began to lose contact with the truth of yourself.

—

Survival is necessary.

But survival is not the destination.

—

There is a version of you that does not have to choose between being safe and being real.

That does not have to perform in order to be permitted.

That does not have to become smaller to be allowed.

—

Building that version is not quick.

It requires finding rooms where the real thing is safe.

And then showing up there as yourself —

slowly, carefully, one true thing at a time —

until the full version of you

has somewhere to live.`,
    daddyManism: 'Survival wid no self is not life. It is a different kind of disappearing.',
    reflectionPrompt: "Where have you been performing a version of yourself to survive — in a relationship, a job, a family? And how much of the real you has access to daylight right now?",
    challengePrompt: "Find one space today where the real version of you is safe to show up. Even small. Even briefly. Let that version breathe. Give it room to exist, even for a moment.",
    livityPrompt: "Create safety today for someone else's real version. Make it clear — through how you listen, what you accept, how you respond — that they do not have to perform for you.",
    journalPrompt: 'What part of me has been in hiding longest — and what would it need to come out?',
    closingText: "You survived.\n\nAnd the self you protected to survive\nis still in there.\n\n—\n\nFind the rooms where it is safe.\n\nBring it with you.\n\nIt has been waiting long enough.",
    published: true,
  },
  {
    dayNumber: 52,
    phase: 'EGG',
    title: 'Practice Responsibility',
    lie: 'I cannot be trusted with responsibility.',
    truth: 'Responsibility grows by being practiced.',
    body: `You have failed at something that mattered.

Maybe more than once.

And from that failure — or those failures — you drew a conclusion:

I am not the kind of person who can be trusted with important things.

—

And so you have stayed small.

Stayed in the lane where the stakes are low and the damage is contained.

Not because the opportunities weren't there.

Because you did not trust yourself with them.

—

But here is what nobody told you about responsibility:

It is not a trait you have or don't have.

It is a practice.

—

Nobody is born responsible.

Responsibility is built the same way trust is built:

Through repetition.

Through showing up.

Through honoring small commitments until larger ones become possible.

Through failing and recovering and trying again.

—

The person who is trustworthy today

was not trustworthy ten years ago in the same way.

They became trustworthy by practicing.

—

You do not need to prove you are already responsible.

You need to begin practicing.

—

Start with something small.

One commitment.

One kept promise.

One time you showed up when you said you would.

—

Responsibility is not a gift.

It is a muscle.

And you have not been using it enough

to know how strong it can become.`,
    daddyManism: 'Responsibility nuh come wid di person. It come wid di practice. Start small. Keep di promise.',
    reflectionPrompt: "Where have you decided you cannot be trusted — and have you been using that decision as a reason to avoid practicing? What small responsibility have you been avoiding because of the fear of failing it again?",
    challengePrompt: "Make one small commitment today and keep it. Not a grand promise — something achievable. Then keep it. That is the practice. Repeat it tomorrow.",
    livityPrompt: "Give someone a responsibility today that you would normally handle yourself. Let them practice. Hold the space for them to succeed or fail without taking it back.",
    journalPrompt: 'What small commitment can I make today that I am willing to keep — and build from?',
    closingText: "You are not permanently untrustworthy.\n\nYou are unpracticed.\n\n—\n\nBegin the practice.\n\nOne kept promise at a time.",
    published: true,
  },
  {
    dayNumber: 53,
    phase: 'EGG',
    title: 'No Shame',
    lie: 'My story is shameful.',
    truth: 'Your story may be painful. Pain is not shame.',
    body: `There are things in your story you have not told anyone.

Not because you forgot.

Because the telling feels like exposure.

Like handing someone ammunition.

Like confirming what you have always feared they would think.

—

Shame is specific.

It is not guilt — guilt says I did something wrong.

Shame says I am something wrong.

—

And somewhere in your story, shame landed.

Not because of what you were.

Because of what was done.

Or what was not done.

Or what you did under conditions that shame never accounts for.

—

But shame does not care about conditions.

Shame does not acknowledge context.

Shame just says: this is what you are.

And it makes you want to hide the evidence.

—

The problem is:

what you hide grows.

—

The story you cannot tell owns you.

The thing you cannot say has more power over you than the thing you can speak plainly.

—

Shame lives in the dark.

It does not survive being named clearly in a room with a safe person.

—

You do not have to tell everyone.

You do not have to perform your wound for an audience.

—

But there is a difference between privacy and hiding.

Privacy says: this is mine, and I share it with people who have earned it.

Hiding says: this is poison, and I keep it sealed because the world will end if it escapes.

—

Your story is not poison.

It is a story.

A painful one.

But pain is not shame.

And you are not what happened.`,
    daddyManism: 'Shame live in di dark. Name it in di light wid di right person and watch what happen to it.',
    reflectionPrompt: "What part of your story carries shame? Not guilt for a specific action — shame about who you are. Where did that shame come from? And is it accurate?",
    challengePrompt: "Tell one part of your story today to one safe person that you have been carrying in shame. Not the whole thing. One piece. Name it plainly. Let someone else hold it with you.",
    livityPrompt: "Receive someone's shame today without flinching. Let them tell you something they have been hiding and respond with presence, not judgment. Show them what it looks like when shame doesn't destroy the room.",
    journalPrompt: "What story am I keeping in the dark that would lose some of its power if it was spoken out loud to the right person?",
    closingText: "Your story is not evidence against you.\n\nIt is evidence of what was survived.\n\n—\n\nBring it into the light.\n\nWith the right person.\n\nAnd watch shame do\nwhat shame always does in the light:\n\ndiminish.",
    published: true,
  },
  {
    dayNumber: 54,
    phase: 'EGG',
    title: 'Honor the Field',
    lie: 'If I become better, I betray where I came from.',
    truth: 'Healing the field honors the place that raised you.',
    body: `You come from somewhere.

A neighborhood. A family. A culture. A specific kind of poverty or pain or particular version of hardship.

And the people from that place —

some of them —

have made it clear that leaving is betrayal.

That changing is pretending.

That becoming someone different means you think you are better.

—

And so you have been holding yourself back.

Dimming yourself.

Staying in a shape that does not threaten the people who knew you when.

—

Out of loyalty.

Or what looks like loyalty.

—

But here is the question:

What does the place you come from actually need?

—

Does it need you to stay broken to keep it company?

Does it need you to stay small so it doesn't feel left behind?

—

Or does it need someone who came from it

to show what is possible from it?

—

The tree that grows tall from difficult soil

does not betray the soil.

It is the soil's greatest testimony.

—

Your healing is not a rejection of where you came from.

It is proof of what that place was capable of producing.

—

Go back different.

Go back better.

Go back and tend the field that raised you

instead of lying down in it

to prove you never left.`,
    daddyManism: "Growing tall nuh mean yuh forget di soil. It mean di soil did good enough fi grow yuh.",
    reflectionPrompt: "Where are you staying small out of loyalty to a place or people that you fear would feel left behind by your growth? And is that what they actually need from you?",
    challengePrompt: "Do one thing today that honors where you came from AND represents who you are becoming. Not one or the other — both. Growth that remembers its roots.",
    livityPrompt: "Go back today — literally or in intention — to the field that raised you. Give something to it. Not from obligation but from gratitude. Show it what it grew.",
    journalPrompt: 'How does my becoming honor where I came from rather than betray it?',
    closingText: "You did not leave to forget.\n\nYou grew to come back differently.\n\n—\n\nThe field that raised you\ndoes not need your smallness.\n\nIt needs your harvest.",
    published: true,
  },
  {
    dayNumber: 55,
    phase: 'EGG',
    title: 'Righteous Power',
    lie: 'I must choose between peace and power.',
    truth: 'Peace is power under righteous command.',
    body: `You have seen power misused.

The person with authority who used it to take.

The one with strength who used it to dominate.

The one with influence who used it to control.

And you decided:

I do not want to be that.

—

So you chose peace.

You chose gentleness.

You chose smallness, sometimes, because it felt safer than the alternative.

—

But here is what the choice cost you:

Your power does not disappear when you refuse to claim it.

It just becomes available to someone else.

—

The abdication of righteous power

is not peace.

It is the surrender of the field to whoever is willing to take it.

—

Power under righteous command is different from power misused.

It is not domination. It is stewardship.

It is not taking. It is building.

It is not control. It is direction.

—

The strongest leaders in the field

are not the ones who grab the most.

They are the ones who know when to move

and when to still.

When to speak

and when to stand in silence that says everything.

When to take up space

because the space without them would be taken by something worse.

—

Do not abandon your power to prove you are peaceful.

Use your power peacefully.

That is not a compromise.

That is the whole point.`,
    daddyManism: 'Peace wid no power is just submission. Power wid no peace is just violence. Righteous power is both.',
    reflectionPrompt: "Where have you chosen smallness because you were afraid of what you would become if you claimed your power? And what has that space been filled with in your absence?",
    challengePrompt: "Claim one space today that you have been leaving empty out of fear of your own power. Not aggressively — deliberately. Step into the room fully. Let your presence be the whole of it.",
    livityPrompt: "Use your influence today to lift someone who does not have it. That is what righteous power does: it does not hoard its position. It uses it to create more positions.",
    journalPrompt: 'What would I do differently if I stopped being afraid of my own power?',
    closingText: "You were not built for smallness.\n\nYou were built for righteous power.\n\n—\n\nClaim it.\n\nAnd use it\nthe way it was always meant to be used:\nfor the field.",
    published: true,
  },
  {
    dayNumber: 56,
    phase: 'EGG',
    title: 'Something to Give',
    lie: 'I have nothing to give.',
    truth: 'Even an Egg can plant a seed.',
    body: `You have been waiting until you have more.

More stability. More healing. More resources.

More of whatever it is that would make you feel like you have something worth offering.

—

The waiting has been going on for a while.

—

But here is what the Ark knows:

There is no stage of the journey

at which you have nothing to give.

—

The Egg has not yet become the Caterpillar.

The Caterpillar has not yet surrendered to the J-Shape.

And yet — the Egg can plant a seed.

—

What does an Egg have to give?

The willingness to be here.

The honesty of being at the beginning.

The testimony of someone who is still choosing the process

on a day when stopping would have been easier.

—

That is not nothing.

That is the thing someone else needed to see

to know they could keep going.

—

You do not have to be fully formed to give something real.

You do not have to have arrived to point someone else toward the direction.

You do not have to be healed to hold someone else's wound carefully.

—

Give from where you are.

Not from where you think you need to be.

The fullness of what you will become

is not required for the giving that is needed today.`,
    daddyManism: 'Yuh nuh haffi be di butterfly fi give something. Di Egg still have something di world need.',
    reflectionPrompt: "What are you waiting to have before you feel like you have something to give? And is there something you could offer right now — from exactly where you are — that someone else actually needs?",
    challengePrompt: "Give something today from exactly where you are. Not from a place of abundance — from your current honest place. A word. A moment. A presence. Something that costs you something real.",
    livityPrompt: "Let your current struggle be a gift today. Tell someone the honest truth of where you are and what you are learning in it. Let your process be their permission to be in theirs.",
    journalPrompt: 'What can I give today from exactly where I am — not from where I think I need to be?',
    closingText: "You have something.\n\nRight now.\n\nFrom exactly here.\n\n—\n\nGive it.\n\nThe world does not need you to wait until you are finished\nto begin being useful.",
    published: true,
  },
  {
    dayNumber: 57,
    phase: 'EGG',
    title: 'Final Word',
    lie: 'The world already decided who I am.',
    truth: 'The world does not get the final word.',
    body: `They said something about you.

A teacher. A parent. A person who should have known better.

A system that processed you as a type instead of a person.

A community that assigned you a role and expected you to stay in it.

—

And the verdict went into you.

The way verdicts do when they arrive before you are old enough to cross-examine them.

You accepted it.

Not because it was true.

Because it was the only account available.

—

But here is what was always true:

They do not get the final word.

—

Not the teacher who said you weren't capable.

Not the parent who said you wouldn't amount to anything.

Not the system that filed you under a category and lost the key.

Not the street that told you this is as far as it goes.

—

Not even the version of yourself

that agreed with all of them.

—

The final word belongs to what you become.

Not what anyone said you would.

Not what the evidence suggested when the evidence was collected by people who were not paying attention.

—

What you become

is the final word.

—

And you have not finished speaking yet.`,
    daddyManism: "Dem nuh write di last chapter. Dem nuh even have di pen fi dat part. Dat part is yours.",
    reflectionPrompt: "Whose verdict about you have you been living inside? Who said something about you — or what system processed you in a way — that you accepted as the final word?",
    challengePrompt: "Write a counter-verdict today. One sentence that is true about you that directly contradicts what was said. Not optimistic fiction — something you can actually evidence. Say it out loud. Mean it.",
    livityPrompt: "Help someone today write their counter-verdict. Someone who has been living inside what was said about them. Tell them what you actually see. Let your word compete with the one that got there first.",
    journalPrompt: 'What is the last chapter they said I would not write — that I am going to write anyway?',
    closingText: "They said their piece.\n\nIt was not the final word.\n\n—\n\nYou have not finished speaking.\n\nAnd what you become\nwill say everything\nthey were wrong about.",
    published: true,
  },
  {
    dayNumber: 58,
    phase: 'EGG',
    title: 'Become the Tending',
    lie: 'I cannot become a father because I was not fathered well.',
    truth: 'The untended can become the tending.',
    body: `Nobody showed you what this was supposed to look like.

Not clearly. Not consistently. Not in a way that left you with a model you could trust.

—

And so when the moment came to be the father —

or the mentor, the elder, the presence a young person needed —

you hesitated.

Because what do you give

when nobody gave it to you?

How do you show something

you were never shown?

—

You are asking the wrong question.

—

The right question is not:

how do I give what I never received?

The right question is:

what did I need —

and did not get —

that I can now choose to give?

—

The person who was not tended

knows exactly what tending looks like.

Not from memory.

From the shape of the absence.

The outline of what was missing

is a precise blueprint for what is needed.

—

You know what it felt like when nobody came.

You know what it cost to carry things alone.

You know what it would have meant

if someone had seen you.

—

Give that.

—

The untended do not become the untending by default.

They become the tending by choice.

—

And that choice —

made deliberately, from the wound rather than despite it —

is one of the most powerful acts a human being can make.

You do not pass on what was given to you.

You give what you needed.

And the chain does not just stop.

It reverses.`,
    daddyManism: 'Yuh know exactly what was missing because yuh felt di hole. Dat hole is di blueprint. Fill it fi somebody else.',
    reflectionPrompt: "What did you need from a father — or a mentor, an elder, a steady presence — that you did not receive? Name it specifically. That specific thing is what you are now equipped to give.",
    challengePrompt: "Find one person today who is in a position you were once in — young, unseen, carrying something without guidance — and give them one thing you needed. A word. Your time. Your attention. A door you open.",
    livityPrompt: "Be the presence today that you needed and didn't have. Not perfectly. Not with all the answers. Just: show up. Stay. See them. That is the whole of it.",
    journalPrompt: 'What would I have needed? And who can I give it to now?',
    closingText: "You were not tended the way you should have been.\n\nAnd you know exactly what that means.\n\n—\n\nThat knowledge is not just a wound.\n\nIt is the most precise qualification\nfor the work you are now called to.\n\nBecome the tending.",
    published: true,
  },
  {
    dayNumber: 59,
    phase: 'EGG',
    title: 'Leave the Shell',
    lie: 'If I leave the shell, I will lose myself.',
    truth: 'The shell protected the beginning. It was not meant for the whole life.',
    body: `You built a shell.

Maybe it was a persona. A wall. A way of being that kept the real thing protected.

Maybe it was a community you could not imagine being outside of.

A way of seeing the world that felt like identity.

A version of yourself that worked — that survived — that got you to here.

—

And now something is pressing against the inside of it.

Something that is growing.

Something that does not fit the old shape anymore.

—

And you are afraid.

Because the shell is everything you know.

And what is on the other side of it is not yet clear.

—

But the shell was never the destination.

—

The shell is the protection the beginning required.

It kept the vulnerable thing safe while it was still forming.

It did its job.

—

But the thing that needed protecting

is no longer what it was when it went in.

—

It has grown.

And grown things do not fit in their old shells.

—

Leaving the shell is not losing yourself.

It is discovering that what you are

was always larger than what you were using to contain it.

—

The butterfly does not mourn the chrysalis.

It leaves it behind

because it is too small now

for what it became.`,
    daddyManism: "Di shell was di shelter, not di self. What yuh are has always been bigger than what yuh been hiding in.",
    reflectionPrompt: "What shell have you been living in that has kept you safe — but that you are now pressing against? What are you afraid you will lose if you leave it?",
    challengePrompt: "Take one step today outside the shell. Not a leap. A deliberate crack. Do one thing the shell would not have permitted. See whether you survive the exposure. You will.",
    livityPrompt: "Help someone today see that the shell that protected them is now limiting them. Not by pushing them out — by helping them see how much they have outgrown it. That recognition is the gift.",
    journalPrompt: 'What have I outgrown that I am still living inside?',
    closingText: "The shell served you.\n\nHonor it for that.\n\n—\n\nAnd then leave it.\n\nWhat you are\nwas never meant to stay\nthe size of what protected you\nwhen you were still becoming.",
    published: true,
  },
  {
    dayNumber: 60,
    phase: 'EGG',
    title: 'Crack the Shell',
    lie: 'I am not ready to grow.',
    truth: 'Growth begins before readiness feels complete.',
    body: `You have arrived at Day 60.

Sixty days.

Sixty lies.

Sixty truths to hold against them.

—

You came when you didn't feel like it.

You returned when the easier choice was to stop.

You sat with things that were uncomfortable to sit with.

You named things that had no name before you arrived here.

—

And you are still here.

—

We want to say something before the Egg Phase ends:

The shell is cracking.

Not because you are ready.

Not because everything is resolved.

Not because the lies have all gone quiet.

—

It is cracking because you have been growing inside it

and growing things crack shells.

That is what growth does.

It demands more room.

—

You are not ready.

You will never feel fully ready.

Readiness is not the condition for cracking the shell.

The cracking is how readiness is born.

—

In the next phase, everything changes.

The Egg becomes the Caterpillar.

The consuming begins.

The growing becomes visible.

The work moves from the inside to the outside.

—

But before that —

stand here for a moment.

—

Sixty days.

Sixty lies that told you that you did not belong here,

that you were not capable of this,

that the circle did not include you,

that the field was not for you,

that you were too damaged, too late, too far gone,

too unknown, too guilty, too ashamed, too finished.

—

And you stayed.

—

The shell is cracking.

You are the one cracking it.

—

That is not nothing.

That is the whole beginning.`,
    daddyManism: 'Sixty days. Sixty lies. And yuh still here. Di shell crackin from di inside. Dat is yuh.',
    reflectionPrompt: "Look back across 60 days. Which lie landed hardest? Which truth did you least expect? Where did you almost stop — and what made you stay?",
    challengePrompt: "Write a letter to who you were on Day 1. Tell them what you now know. Tell them what was coming. Tell them what they were wrong about. Send it forward — not back. Let it be the bridge.",
    livityPrompt: "Pass the beginning to someone. Tell someone today that Day 1 is available to them — that the circle includes them, that the process is real. Be the person who first told you it was possible.",
    journalPrompt: 'Who am I on Day 60 that I was not on Day 1?',
    closingText: "The Egg Phase is complete.\n\nSixty days.\n\nSixty lies answered.\n\n—\n\nThe shell is cracking from the inside.\n\nThat is the sound of you\nbecoming what you were always going to be.\n\nThe Caterpillar begins.\n\nKeep going.",
    published: true,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CATERPILLAR PHASE — Days 61–110
  // The Egg removed lies. The Caterpillar feeds growth.
  // Structure shifts: Lie→Truth becomes Hunger→Nourishment.
  // (lie field = The Hunger, truth field = The Nourishment)
  // XP fades, Livity rises — primary evidence of growth by Ring 3.
  // ══════════════════════════════════════════════════════════════════════════

  // ── RING 1 — CONSUMING WELL (Days 61–75) ─────────────────────────────────
  // "What am I feeding on?"

  {
    dayNumber: 61,
    phase: 'CATERPILLAR',
    title: 'The First Meal',
    lie: 'I survived the hard part. Now I can coast.',
    truth: 'Surviving was the beginning. Now you grow.',
    body: `You made it through the Egg.

Sixty days. Sixty lies. And you are still here.

Take that in for a moment — because most people never crack the shell.

—

But here is what the shell-crack actually means:

It does not mean you have arrived.

It means you have been born.

—

The caterpillar that emerges from the egg does not rest.

It does one thing, immediately and constantly:

It eats.

—

Not out of greed.

Out of necessity.

Because everything it will become — the chrysalis, the wings, the flight —

is built from what it consumes now.

—

You have spent sixty days clearing out what was false.

The ground is open.

Empty.

Ready.

—

The question is no longer: what lies have been holding me down?

The question is now: what am I going to feed on

to become what I am meant to be?

—

The Egg was about subtraction.

The Caterpillar is about what you take in.

Eat well.

Everything depends on it.`,
    daddyManism: 'Yuh hatch already. Now di real work start — yuh haffi eat fi grow.',
    reflectionPrompt: 'The Egg cleared the ground. What do you want to grow in the open space now? Not what you want to remove — what you want to build.',
    challengePrompt: 'Choose one thing today that you will deliberately feed on this phase — a book, a practice, a skill, a discipline. Name it. Write down why it will help you grow. This is your first meal.',
    livityPrompt: "Feed someone today — literally or otherwise. Share something that helps another person grow. You are learning to consume; begin also learning to nourish.",
    journalPrompt: 'What am I choosing to grow into now that the ground is clear?',
    closingText: "The shell is behind you.\n\nThe growing is ahead.\n\n—\n\nA caterpillar eats its own weight many times over\nbefore it can fly.\n\nBegin the feast.",
    published: true,
  },
  {
    dayNumber: 62,
    phase: 'CATERPILLAR',
    title: 'The Appetite You Inherited',
    lie: 'I crave what I crave. That is just who I am.',
    truth: 'You can choose a new appetite.',
    body: `You did not choose your first hungers.

They were fed to you.

What comforted you. What numbed you. What you reached for when the day got heavy.

You learned those appetites the way you learned a language —

before you knew you were learning anything at all.

—

And now they feel like you.

The craving feels like identity.

"This is just what I like. This is just how I am."

—

But an appetite is not a fixed thing.

It is a trained thing.

—

What you feed grows hungrier.

What you starve grows quieter.

—

The person who feeds on outrage develops an appetite for outrage.

The person who feeds on distraction craves more distraction.

The person who feeds on the cheap thing loses the taste for the real thing.

—

This works in reverse too.

Feed on something good long enough, and you begin to crave it.

The body and the mind adapt to what they are given.

—

You are not stuck with the appetite you inherited.

You can retrain it.

Not by willpower alone —

by what you choose to put in front of yourself,

meal after meal,

until the craving itself begins to change.`,
    daddyManism: 'What yuh feed grow hungry. What yuh starve grow quiet. Choose what yuh feed.',
    reflectionPrompt: 'What is one appetite you inherited rather than chose? Where did it come from? And is it feeding your growth or just feeding itself?',
    challengePrompt: 'Identify one craving you want to retrain. Today, when it rises, feed it something better instead — not nothing, something better. Replacement, not just refusal. Notice it is possible.',
    livityPrompt: 'Help someone replace a hunger today — not by lecturing, but by offering something better. Sit with someone instead of letting them scroll alone. Be the better meal.',
    journalPrompt: 'What appetite do I want to train myself out of — and what would I feed instead?',
    closingText: "The craving you inherited\nis not a life sentence.\n\n—\n\nFeed the new appetite\nmeal after meal\nuntil it becomes the one you reach for.",
    published: true,
  },
  {
    dayNumber: 63,
    phase: 'CATERPILLAR',
    title: 'Attention Is Food',
    lie: 'What I look at doesn’t really affect me.',
    truth: 'What you watch becomes what you are.',
    body: `You think you are just looking.

Just scrolling. Just watching. Just passing the time.

As if attention were free.

As if what passes before your eyes leaves nothing behind.

—

But attention is not free.

Attention is the most valuable thing you have —

and everything you give it to

is feeding on you while you feed on it.

—

What you watch is not neutral.

It is shaping the inside of you, frame by frame.

The comparison that makes you feel small.

The outrage that keeps you agitated.

The endless feed engineered to take your hours and give back nothing.

—

You are what you eat.

And attention is a kind of eating.

—

The caterpillar that eats poison leaves does not become a poisoned butterfly.

It dies before it can transform.

—

What you give your eyes and your hours to

is becoming you.

Slowly. Invisibly. Certainly.

—

So guard the gate.

Not with shame — with intention.

Choose what you let in

the way you would choose what you put in your body

if you knew it was building the person you are becoming.

Because it is.`,
    daddyManism: 'What yuh watch a feed yuh. So mind what yuh let inna yuh eye.',
    reflectionPrompt: 'What have you been feeding your attention to lately? If you became what you watched this week, who would you be?',
    challengePrompt: 'Cut one source of empty attention today — one feed, one app, one habit that takes your hours and gives nothing back. Replace that time with something that builds you. Just for today. Notice the difference.',
    livityPrompt: 'Give someone your full attention today — no phone, no half-listening. Real presence is a gift almost no one gives anymore. Feed someone with the attention they have been starving for.',
    journalPrompt: 'What is my attention building in me right now — and is it what I want to become?',
    closingText: "Attention is food.\n\nYou are eating with your eyes\nevery hour of every day.\n\n—\n\nChoose the meal\nthat builds the wings.",
    published: true,
  },
  {
    dayNumber: 64,
    phase: 'CATERPILLAR',
    title: 'Discipline Is Feeding',
    lie: 'Discipline is punishment.',
    truth: 'Discipline is feeding yourself on purpose.',
    body: `Somewhere you learned that discipline was a kind of punishment.

Something done to you.

Something cold, harsh, joyless — the opposite of freedom.

And so you have resisted it.

Associated it with deprivation. With control. With the people who used "discipline" as a word for cruelty.

—

But that was never what discipline was.

—

Discipline is not punishment.

Discipline is feeding yourself on purpose

instead of letting your weakest impulse decide what you eat.

—

The caterpillar does not eat at random.

It does not wait until it feels like eating.

It eats steadily, deliberately, because growth requires it.

—

Discipline is just that:

doing the thing that feeds your growth

whether or not the feeling has arrived to make it easy.

—

The undisciplined life is not a free life.

It is a life ruled by whatever impulse is loudest in the moment.

That is not freedom.

That is being eaten by your own appetites.

—

Discipline is how you take the fork back.

It is how you decide what feeds you

instead of being fed on by every craving that walks by.

—

It is not the enemy of freedom.

It is the only road to it.`,
    daddyManism: 'Discipline nuh punishment. A just yuh deciding what feed yuh, instead of yuh weakness deciding.',
    reflectionPrompt: 'Where have you been resisting discipline because you confused it with punishment? What would it look like to see it instead as feeding yourself on purpose?',
    challengePrompt: 'Do one disciplined thing today before the feeling to do it arrives. The workout, the page, the call, the practice. Act first; let the feeling catch up. That is the whole skill.',
    livityPrompt: 'Support someone today who is building a discipline. Encourage the boring, unglamorous repetition. Be the voice that says: keep going, it is working even when it does not feel like it.',
    journalPrompt: 'What discipline would feed my growth if I stopped waiting to feel like it?',
    closingText: "Discipline is not the whip.\n\nIt is the fork —\nin your own hand,\nchoosing the meal that builds you.\n\n—\n\nTake it back.",
    published: true,
  },
  {
    dayNumber: 65,
    phase: 'CATERPILLAR',
    title: 'Rest Is Nourishment',
    lie: 'Rest is laziness. I have to earn the right to stop.',
    truth: 'Rest is part of growth, not the absence of it.',
    body: `You have been treating rest like a reward you have not earned.

Something to be allowed only after everything is done.

And since everything is never done —

you rarely allow it.

—

So you push. You grind. You keep going on empty,

wearing your exhaustion like proof of your worth.

—

But here is what the field knows:

Growth does not happen during the work alone.

—

The muscle does not grow in the gym.

It grows in the rest after.

The field does not produce in constant motion.

It lies fallow between seasons so it can produce again.

—

The caterpillar, between its feeding, is still.

That stillness is not laziness.

It is where the eating becomes growing.

—

Rest is not the opposite of growth.

Rest is the part of growth you have been skipping.

—

And the refusal to rest is not strength.

It is often fear —

fear that if you stop, you will discover you are only worth what you produce.

—

You are worth more than your output.

And the rest you have been denying yourself

is not a luxury.

It is the soil where everything you are feeding on

finally turns into who you are becoming.`,
    daddyManism: 'Di muscle nuh grow inna di work. It grow inna di rest after. Stop wearing tiredness like a medal.',
    reflectionPrompt: 'Why is it hard for you to rest? What do you believe stopping says about you? And is that belief actually true?',
    challengePrompt: 'Rest on purpose today — without guilt, without earning it first. Take real rest, not collapse. Let it be deliberate. Notice what it gives back to you.',
    livityPrompt: 'Give someone permission to rest today. Take something off their plate. Tell the tired person they are allowed to stop. Be the rest someone else cannot give themselves.',
    journalPrompt: 'What would change if I treated rest as part of the work instead of a reward for it?',
    closingText: "Rest is not the absence of growth.\n\nIt is where the feeding\nbecomes the becoming.\n\n—\n\nLie fallow.\n\nTrust the season.",
    published: true,
  },
];

// ── Seed utility — runs on every startup, skips days that already exist ────────

export async function seedJourneyDays() {
  await prisma.journeyDay.createMany({ data: SEED_DAYS, skipDuplicates: true });
  const count = await prisma.journeyDay.count();
  console.log(`[Journey] Seed complete — ${count} days in DB`);
}

// ── User: get or start journey ────────────────────────────────────────────────

export async function getMyJourney(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  let userJourney = await prisma.userJourney.findUnique({ where: { userId } });

  // Not started yet — return null so frontend shows the start screen
  if (!userJourney) {
    return res.json({ started: false });
  }

  // Calculate which day they're on based on entries and time
  const dayNumber = userJourney.currentDay;

  const [day, entry] = await Promise.all([
    prisma.journeyDay.findUnique({
      where: { dayNumber },
      select: {
        dayNumber: true, phase: true, title: true, lie: true, truth: true,
        body: true, daddyManism: true, reflectionPrompt: true,
        challengePrompt: true, livityPrompt: true, journalPrompt: true,
        closingText: true, published: true,
      },
    }),
    prisma.journeyEntry.findUnique({
      where: { userId_dayNumber: { userId, dayNumber } },
    }),
  ]);

  if (!day || !day.published) {
    return res.json({
      started: true,
      dayNumber,
      day: null,
      entry: null,
      message: "This day is being written. Check back soon.",
    });
  }

  res.json({ started: true, dayNumber, day, entry });
}

// ── User: begin journey ───────────────────────────────────────────────────────

export async function beginJourney(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const existing = await prisma.userJourney.findUnique({ where: { userId } });
  if (existing) return res.json({ journey: existing });

  const journey = await prisma.userJourney.create({
    data: { userId },
  });

  res.status(201).json({ journey });
}

// ── User: save entry (reflection / challenge / journal) ───────────────────────

export async function saveEntry(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { reflectionText, challengeText, journalText } = req.body;

  const userJourney = await prisma.userJourney.findUnique({ where: { userId } });
  if (!userJourney) return res.status(400).json({ error: 'Journey not started' });

  const dayNumber = userJourney.currentDay;

  const entry = await prisma.journeyEntry.upsert({
    where: { userId_dayNumber: { userId, dayNumber } },
    update: { reflectionText, challengeText, journalText },
    create: { userId, dayNumber, reflectionText, challengeText, journalText },
  });

  res.json({ entry });
}

// ── User: complete a day → unlock the next ────────────────────────────────────

export async function completeDay(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const userJourney = await prisma.userJourney.findUnique({ where: { userId } });
  if (!userJourney) return res.status(400).json({ error: 'Journey not started' });

  const dayNumber = userJourney.currentDay;

  // Mark entry as completed
  const entry = await prisma.journeyEntry.upsert({
    where: { userId_dayNumber: { userId, dayNumber } },
    update: { completedAt: new Date() },
    create: { userId, dayNumber, completedAt: new Date() },
  });

  // Advance to next day
  const nextDay = dayNumber + 1;
  const nextExists = await prisma.journeyDay.findUnique({
    where: { dayNumber: nextDay },
    select: { dayNumber: true, published: true },
  });

  await prisma.userJourney.update({
    where: { userId },
    data: {
      currentDay: nextExists?.published ? nextDay : dayNumber,
      updatedAt: new Date(),
    },
  });

  res.json({ entry, nextDay: nextExists?.published ? nextDay : null });
}

// ── Admin: list all days ──────────────────────────────────────────────────────

export async function adminListDays(_req: Request, res: Response) {
  const days = await prisma.journeyDay.findMany({
    orderBy: { dayNumber: 'asc' },
    select: {
      id: true, dayNumber: true, phase: true, title: true,
      lie: true, truth: true, published: true, updatedAt: true,
      _count: { select: { entries: true } },
    },
  });
  res.json({ days });
}

// ── Admin: get single day ─────────────────────────────────────────────────────

export async function adminGetDay(req: Request, res: Response) {
  const day = await prisma.journeyDay.findUnique({
    where: { dayNumber: Number(req.params.day) },
  });
  if (!day) return res.status(404).json({ error: 'Day not found' });
  res.json({ day });
}

// ── Admin: create or update a day ────────────────────────────────────────────

export async function adminUpsertDay(req: Request, res: Response) {
  const { dayNumber, phase, title, lie, truth, body, daddyManism,
          reflectionPrompt, challengePrompt, livityPrompt, journalPrompt,
          closingText, published } = req.body;

  if (!dayNumber || !title || !body) {
    return res.status(400).json({ error: 'dayNumber, title, and body are required' });
  }

  const day = await prisma.journeyDay.upsert({
    where: { dayNumber: Number(dayNumber) },
    update: { phase, title, lie, truth, body, daddyManism, reflectionPrompt,
              challengePrompt, livityPrompt, journalPrompt, closingText,
              published: published ?? false, updatedAt: new Date() },
    create: { dayNumber: Number(dayNumber), phase: phase ?? 'EGG', title,
              lie: lie ?? '', truth: truth ?? '', body, daddyManism: daddyManism ?? '',
              reflectionPrompt: reflectionPrompt ?? '', challengePrompt: challengePrompt ?? '',
              livityPrompt: livityPrompt ?? '', journalPrompt: journalPrompt ?? '',
              closingText: closingText ?? '', published: published ?? false },
  });

  res.json({ day });
}

// ── Admin: delete a day ───────────────────────────────────────────────────────

export async function adminDeleteDay(req: Request, res: Response) {
  await prisma.journeyDay.delete({ where: { dayNumber: Number(req.params.day) } });
  res.json({ ok: true });
}
