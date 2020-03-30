import React, { Component } from 'react';

const EntryPlacement = {
  MANUAL:   0,
  DISTANCE: 1,
};

export default class Temp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      entry_placement: EntryPlacement.DISTANCE,
    };
    this.entryPlacementChangeHandler = this.entryPlacementChangeHandler.bind(this);
  }

  entryPlacementChangeHandler(e) {
    this.setState({ entry_placement: e.target.value });
  }

  render() {
    return (
      <select onChange={this.entryPlacementChangeHandler}>
        {
          Object.entries(EntryPlacement).map(([key, val]) =>
            <option key={key} value={val}
                    selected={val === this.state.entry_placement}>
              {key}
            </option>
          )
        }
      </select>
    );
  }
}

// export default function Temp(props) {
//   const timer = console.time('label69');
//
//   const foo = {
//     name:       'anton',
//     age:        69,
//     occupation: 'retired',
//   };
//   const bar = {
//     name:       'barry',
//     age:        42,
//     occupation: 'trader',
//   };
//   const qux = {
//     name:       'christian',
//     age:        420,
//     occupation: 'intergalactic overlord',
//   };
//
//   console.log({ foo });
//   console.log({ foo, bar, qux });
//   console.table({ foo, bar, qux });
//
//   const username = "zorro";
//
//   console.log({ username });
//
//   console.log('%c How much of this will I remember when I find this again?',
//     'color: orange; font-weight: bold;');
//
//   console.timeEnd('label69');
//
//   return <p>Hello, world! Check out the console!</p>;
// }