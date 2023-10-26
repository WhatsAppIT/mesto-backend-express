const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const MONGO_DUBLICATE_ERROR_CODE = require("../utils/constants");
//const { STATUS_CODES } = require("node:http");
//const { constants as HTTP_STATUS } = require('node:http2');
//console.log(STATUS_CODES);
//console.log(HTTP_STATUS);

const { key } = process.env;

const AuthError = require("../errors/AuthError");
const ValidationError = require("../errors/ValidationError");
const NotFoundError = require("../errors/ValidationError");
const RepeatError = require("../errors/RepeatError");
const ServerError = require("../errors/ServerError");

const postUser = (req, res, next) => {
  const { name, about, avatar, email, password } = req.body;

  bcrypt.hash(req.body.password, 10).then((hash) => {
    User.create({
      name,
      about,
      avatar,
      email,
      password: hash,
    })
      .then((user) => {
        if (!user) {
          throw new NotFoundError("Нет пользователя с таким id");
        }

        return res.send(user);
      })
      .catch((error) => {
        if (error.name === "ValidationError") {
          return next(
            new ValidationError(
              "Переданы некорректные данные при создании пользователя."
            )
          );
        }

        if (error.code === MONGO_DUBLICATE_ERROR_CODE) {
          return next(new RepeatError("Такаой email уже зарегистрирован."));
        }

        return next(new ServerError("Ошибка на сервере"));
      });
  });
};

const getProfile = (req, res, next) => {
  User.findById(req.user._id)
    .then((user) => {
      if (!user) {
        throw new NotFoundError("Нет пользователя с таким id");
      }
      return res.send({ data: user });
    })
    .catch(next);
  /* if (err.name === "CastError") {
      return next(
        new ValidationError(
          "Переданы некорректные данные при поиске пользователя."
        )
      );
    }
    return next(new ServerError("Ошибка на сервере"));
  } */
};

const login = (req, res, next) => {
  const { email, password } = req.body;

  User.findUserByCredentials({ email, password })
    .then((user) => {
      const token = jwt.sign({ _id: user._id }, key, { expiresIn: "7d" });
      res
        .cookie("jwt", token, {
          maxAge: 7 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          sameSite: true,
        })
        .end();
    })
    .catch((error) => {
      return next(new AuthError("Ошибка на сервере"));
    });
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({});
    return res.send(users);
  } catch (error) {
    return next(new ServerError("Ошибка на сервере"));
  }
};

const getUserId = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      throw new Error("NotFound");
    }

    return res.send(user);
  } catch (error) {
    if (error.message === "NotFound") {
      return res
        .status(NotFound)
        .send({ message: "Пользователь по указанному _id не найден." });
    }

    if (error.name === "CastError") {
      return res.status(ValidationError).send({
        message: "Переданы некорректные данные при поиске пользователя.",
      });
    }

    return next(new ServerError("Ошибка на сервере"));
  }
};

const patchUsersMe = async (req, res, next) => {
  try {
    const { name, about } = req.body;
    const patchUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        about,
      },
      { new: true, runValidators: true }
    );

    if (!patchUser) {
      throw new Error("NotFoundUser");
    }

    return res.send(patchUser);
  } catch (error) {
    if (error.message === "NotFoundUser") {
      return res
        .status(NotFound)
        .send({ message: "Пользователь по указанному _id не найден." });
    }
    if (error.name === "ValidationError") {
      return res.status(ValidationError).send({
        message: "Переданы некорректные данные при поиске пользователя.",
      });
    }

    return next(new ServerError("Ошибка на сервере"));
  }
};

const patchUsersMeAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    const patchAvatar = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true, runValidators: true }
    );

    if (!patchAvatar) {
      throw new Error("NotFoundError");
    }

    return res.send(patchAvatar);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(ValidationError).send({
        message: "Переданы некорректные данные при поиске аватара.",
      });
    }
    if (error.message === "NotFoundError") {
      return res
        .status(NotFound)
        .send({ message: "Aватар по указанному _id не найден." });
    }

    return next(new ServerError("Ошибка на сервере"));
  }
};

module.exports = {
  getProfile,
  login,
  getUsers,
  getUserId,
  postUser,
  patchUsersMe,
  patchUsersMeAvatar,
};
