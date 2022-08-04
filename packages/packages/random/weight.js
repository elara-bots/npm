module.exports = (objects) => {
    let randomNumber = Math.random() * objects.reduce((agg, object) => agg + object.weight, 0),
        weightSum = 0;
    return objects.find(o => {
        weightSum += o.weight;
        return randomNumber <= weightSum;
    });
}