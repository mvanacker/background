import React from 'react';

import Panel from './common/Panel';

const Bubble = ({ children }) => (
  <Panel className="my-bubble">{children}</Panel>
);

export default () => (
  <>
    <Bubble>Hello! My name is Maurits.</Bubble>
    <Bubble>I like coding and I like trading.</Bubble>
    <Bubble>Through this app I share a piece of my heart and soul.</Bubble>
  </>
);
