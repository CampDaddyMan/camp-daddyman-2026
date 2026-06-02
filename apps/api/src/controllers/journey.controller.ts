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
