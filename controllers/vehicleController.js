module.exports.allUsers = function (req, res) {
  let response = { success: false };

  const getQuery = `SELECT * FROM ${USER_TABLE}`;
  connection
    .executeQuery(getQuery)
    .then((result) => {
      if (result.length > 0) {
        response.success = true;
        response.data = result;
      } else {
        response.data = [];
        response.success = true;
        response.message = "No data found";
      }
      res.status(200).json(response);
    })
    .catch((err) => {
      res
        .status(400)
        .json({ success: false, message: "Error while creating user" });
    });
};