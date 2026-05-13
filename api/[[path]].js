import worker from "../dist/server/index.js";

export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  return worker.fetch(request, {}, {});
}
