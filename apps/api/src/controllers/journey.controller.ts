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
