const mongoose = require("mongoose");

const Entry = require("../models/entries.model.js");
const Timer = require("../models/timer.model.js");
const User = require("../models/user.model.js");
const Workspace = require("../models/workspace.model.js");
const Project = require("../models/project.model.js");

const { calculateTime } = require("../config/lib/timeCalculator.js");

//Start the Timer
const startTimer = async (req, res) => {
  const { projectId, title, userId } = req.body;

  const workspaceId = req.user.currentWorkspace;

  if (!projectId) {
    return res.status(400).json({ message: "Please select project" });
  }

  try {
    const existingTimer = await Timer.findOne({
      user: userId,
    });

    if (existingTimer.isRunning) {
      return res.status(400).json({ message: "Timer is already running." });
    }

    const newEntry = new Entry({
      startTime: [new Date().toISOString()],
      workspace: workspaceId,
      project: projectId,
      title: title,
      user: userId,
    });

    existingTimer.isRunning = true;
    existingTimer.currentLog = newEntry._id;

    await Promise.all([
      existingTimer.save(),
      newEntry.save(),
      Project.findOneAndUpdate(
        { _id: projectId },
        { $push: { entryLogs: newEntry._id } },
        { new: true }
      ),
    ]);

    const timer = await Timer.findOne({ user: req.user._id })
      .populate({
        path: "currentLog",
        select: "startTime endTime title durationInSeconds project",
      })
      .select({
        isRunning: 1,
        currentLog: 1,
      });

    res.status(201).json({
      status: "Timer started successfully",
      timer,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: `Failed to start timer: ${error.message}` });
  }
};

const checkTimer = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("timer");
    if (!user) {
      return res.status(400).send("user not found!");
    }

    const timer = await Timer.findOne({ user: user._id })
      .populate({
        path: "currentLog",
        select: "startTime endTime title durationInSeconds project",
      })
      .select({
        isRunning: 1,
        currentLog: 1,
      });
    return res.json(timer);
  } catch (error) {
    res.status(500).send(`Something went wrong: ${error.message}`);
  }
};

const stopTimer = async (req, res) => {
  const { projectId, title } = req.body;
  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  } else if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "Please select project" });
  }
  const userId = req.user._id;

  try {
    const { timer: timerId } = await User.findOne({ _id: userId });
    const runningTimer = await Timer.findOne({ _id: timerId });

    if (!runningTimer.currentLog) {
      return res.status(400).json({ message: "No running timer found." });
    }

    const { currentLog } = runningTimer;
    const previousEntry = await Entry.findOne({ _id: currentLog }).populate(
      "project"
    );
    const stopTime = new Date().toISOString();
    let newDurationInSeconds = previousEntry.durationInSeconds || 0;

    if (!previousEntry.endTime.length) {
      const startTime = new Date(previousEntry.startTime[0]).toISOString();
      newDurationInSeconds = calculateTime(
        startTime,
        stopTime,
        newDurationInSeconds
      );
      previousEntry.endTime.push(stopTime);
    } else {
      previousEntry.endTime.push(stopTime);
      const start = previousEntry.startTime[previousEntry.startTime.length - 1];
      const end = previousEntry.endTime[previousEntry.endTime.length - 1];
      newDurationInSeconds += calculateTime(start, end, 0);
    }
    previousEntry.title = title;
    previousEntry.durationInSeconds = newDurationInSeconds;
    await previousEntry.save();

    const updatedTimer = await Timer.findOneAndUpdate(
      { _id: timerId },
      {
        isRunning: false,
        currentLog: null,
      },
      { new: true }
    )
      .populate({
        path: "currentLog",
        select: "startTime endTime title durationInSeconds project",
      })
      .select({
        isRunning: 1,
        currentLog: 1,
      });

    const newEntry = await Entry.findById(previousEntry._id).populate({
      path: "project",
      select: "name description",
    });

    res.status(200).json({
      status: "Timer stopped successfully",
      updatedTimer,
      updatedEntry: newEntry,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: `Failed to stop timerId: ${error.message}` });
  }
};

const resumeTimer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { entryId } = req.body;
    if (!entryId) {
      return res.status(400).send({ message: "Entry id is required" });
    }
    const { timer } = await User.findOne({ _id: userId });
    const existingTimer = await Timer.findOne({
      _id: timer,
      isRunning: true,
    });

    if (existingTimer) {
      return res.status(400).json({ message: "Timer is already running." });
    }
    const entry = await Entry.findById(entryId).populate("project");
    entry.startTime.push(new Date().toISOString());

    await Promise.all([
      entry.save(),
      Timer.findOneAndUpdate(
        { _id: timer },
        {
          isRunning: true,
          currentLog: entryId,
        },
        { new: true }
      ),
    ]);
    return res
      .status(200)
      .send({ message: "Timer started successfully", updatedEntry: entry });
  } catch (error) {
    return res.status(500).send("Failed to resume timer: " + error.message);
  }
};

const pauseTimer = async (req, res) => {
  const userId = req.user._id;

  try {
    const { timer } = await User.findOne({ _id: userId });
    const runningTimer = await Timer.findOne({ _id: timer, isRunning: true });

    if (!runningTimer) {
      return res.status(400).send("No running timer found.");
    }

    const { currentLog } = runningTimer;
    const previousEntry = await Entry.findOne({ _id: currentLog });

    const startTime = new Date(previousEntry.startTime);
    const pauseTime = new Date();

    const timeDifferenceMillis = pauseTime - startTime;
    const timeDifferenceInSeconds = Math.floor(timeDifferenceMillis / 1000);

    let currentDuration = previousEntry.durationInSeconds || 0;
    const newDurationInSeconds = currentDuration + timeDifferenceInSeconds;

    const entryUpdatePromise = Entry.findOneAndUpdate(
      { _id: currentLog },
      { durationInSeconds: parseInt(newDurationInSeconds) },
      { new: true }
    );

    const timerUpdatePromise = Timer.findOneAndUpdate(
      { _id: timer },
      {
        isRunning: false,
      },
      { new: true }
    );

    await Promise.all([entryUpdatePromise, timerUpdatePromise]);

    res.status(200).json({ message: "Pause Successfully" });
  } catch (error) {
    console.error("Error pausing timer:", error);
    return res.status(500).send("Failed to pause timer.");
  }
};

// manual entry
const newManualEntry = async (req, res) => {
  try {
    const { newEntry } = req.body;

    const timerKey = await Timer.findOne({
      _id: (await User.findOne({ _id: newEntry.userId })).timer,
    });

    if (!newEntry) {
      return res.status(400).json({ error: "New entry data is missing." });
    }

    const startDateTime = new Date(newEntry.startTime);
    const endDateTime = new Date(newEntry.endTime);

    if (
      isNaN(startDateTime) ||
      isNaN(endDateTime) ||
      endDateTime <= startDateTime
    ) {
      return res
        .status(400)
        .json({ error: "Invalid date format in startTime or endTime." });
    }

    const durationInSeconds = Math.floor((endDateTime - startDateTime) / 1000);
    if (durationInSeconds < 0) {
      return res
        .status(400)
        .json({ error: "Negative durationInSeconds not allowed." });
    }

    const newManualEntry = new Entry({
      startTime: [newEntry.startTime],
      endTime: [newEntry.endTime],
      workspace: req.user.currentWorkspace,
      project: newEntry.projectId,
      title: newEntry.title,
      user: newEntry.userId,
      createdAt: newEntry.createdAt,
      durationInSeconds,
    });

    await newManualEntry.save();

    let temp = await Entry.find({
      _id: newManualEntry._id,
    }).populate("project");

    timerKey.entryLogs.push(newManualEntry._id);

    const [projectToBeUpdated, userToBeUpdated, workspaceToBeUpdated] =
      await Promise.all([
        Project.findOne({ _id: newEntry.projectId }),
        User.findOne({ _id: newEntry.userId }),
        Workspace.findOne({ _id: req.user.currentWorkspace }),
      ]);

    projectToBeUpdated.entryLogs.push(newManualEntry._id);
    userToBeUpdated.entryLogs.push(newManualEntry._id);
    workspaceToBeUpdated.entryLogs.push(newManualEntry._id);

    await Promise.all([
      timerKey.save(),
      projectToBeUpdated.save(),
      userToBeUpdated.save(),
      workspaceToBeUpdated.save(),
    ]);

    return res
      .status(200)
      .json({ message: "Entry created successfully", entry: temp[0] });
  } catch (error) {
    return res.status(500).json({
      error: `An error occurred while creating the entry: ${error.message}`,
    });
  }
};

async function fetchEntries(req, res) {
  const { lastFetchedDate } = req.params;
  const user = req.user;

  const date = new Date(lastFetchedDate);

  date.setDate(date.getDate() - 7);
  console.log(date, lastFetchedDate);
  try {
    const entries = await Entry.find({
      workspace: user.currentWorkspace,
      user: user._id,
      createdAt: {
        $lt: lastFetchedDate,
        $gte: date.toISOString(),
      },
    }).populate({ path: "project", select: "name description" });

    return res.json({
      entries,
      lastFetchedDate: date.toISOString(),
      reFetchRequired: entries.length ? true : false,
    });
  } catch (error) {
    return res.status(500).json({
      error: `An error occurred while creating the entry: ${error.message}`,
    });
  }
}
module.exports = {
  fetchEntries,
  startTimer,
  stopTimer,
  pauseTimer,
  checkTimer,
  resumeTimer,
  newManualEntry,
};
