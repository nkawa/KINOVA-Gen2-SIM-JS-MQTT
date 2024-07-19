"use client";
import * as React from 'react'
import Controller from './controller.js'

import { connectMQTT, subscribe } from './mqtt_sync.js'

export default function Home() {
  const [rendered, set_rendered] = React.useState(false)
  const robotNameList = ["KINOVA Gen2"]
  const [robotName, set_robotName] = React.useState(robotNameList[0])
  const [rotate, set_rotate] = React.useState({ j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 })
  const [c_pos, set_c_pos] = React.useState({ x: 0, y: 0.5, z: 1.2 })
  const [c_deg, set_c_deg] = React.useState({ x: 0, y: 0, z: 0 })
  const [source, set_source] = React.useState({ x: 0, y: 0, z: 0 })
  const [target, set_target] = React.useState({ x: 0, y: 1.4, z: 0 })
  const [joint_length, set_joint_length] = React.useState([])
  const [nodes, set_nodes] = React.useState([])
  const [node1, set_node1] = React.useState({ x: 0, y: 0, z: 0 })
  const [node2, set_node2] = React.useState({ x: 0, y: 0, z: 0 })
  const [box_scale, set_box_scale] = React.useState("0.03 0.03 0.03")
  const [box_visible, set_box_visible] = React.useState(true)
  const [wrist_rotate, set_wrist_rotate] = React.useState({ x: 0, y: 0, z: 0 })
  const [fabrik_mode, set_fabrik_mode] = React.useState(false)
  let registered = false

  const joint_pos = {
    base: { x: 0, y: 0, z: 0 }, j1: { x: 0, y: 0, z: 0 },
    j2: { x: 0, y: 0.2755, z: 0 }, j3: { x: 0, y: 0.41, z: 0 }, j4: { x: 0.00974, y: 0.2075, z: 0 },
    j5: { x: 0.00026, y: 0.1035, z: 0 }, j6: { x: -0.00025, y: 0.104, z: 0 },
    j7: { x: 0, y: 0.1145, z: 0 }, j8: { x: 0, y: 0.05, z: 0 }
  }

  const distance = (s_pos, t_pos) => {
    return Math.sqrt((t_pos.x - s_pos.x) ** 2 + (t_pos.y - s_pos.y) ** 2 + (t_pos.z - s_pos.z) ** 2);
  }

  const distance2Dx = (s_pos, t_pos) => {
    return Math.sqrt((t_pos.y - s_pos.y) ** 2 + (t_pos.z - s_pos.z) ** 2);
  }

  const distance2Dz = (s_pos, t_pos) => {
    return Math.sqrt((t_pos.x - s_pos.x) ** 2 + (t_pos.y - s_pos.y) ** 2);
  }

  const pos_add = (pos1, pos2) => {
    return { x: (pos1.x + pos2.x), y: (pos1.y + pos2.y), z: (pos1.z + pos2.z) }
  }

  const pos_sub = (pos1, pos2) => {
    return { x: (pos1.x - pos2.x), y: (pos1.y - pos2.y), z: (pos1.z - pos2.z) }
  }

  const getPoint = (t, s, l) => {
    const p = { x: 0, y: 0, z: 0 }
    const d = distance(s, t)

    const dx = (t.x - s.x) / d
    const dy = (t.y - s.y) / d
    const dz = (t.z - s.z) / d

    p.x = Math.round((t.x - dx * l) * 10000) / 10000
    p.y = Math.round((t.y - dy * l) * 10000) / 10000
    p.z = Math.round((t.z - dz * l) * 10000) / 10000

    return p
  }

  const getPoint2Dx = (t, s, l) => {
    const p = { x: 0, y: 0, z: 0 }
    const d = distance2Dx(s, t)

    const dy = (t.y - s.y) / d
    const dz = (t.z - s.z) / d

    p.y = Math.round((t.y - dy * l) * 10000) / 10000
    p.z = Math.round((t.z - dz * l) * 10000) / 10000

    return p
  }

  const getPoint2Dz = (t, s, l) => {
    const p = { x: 0, y: 0, z: 0 }
    const d = distance2Dz(s, t)

    const dx = (t.x - s.x) / d
    const dy = (t.y - s.y) / d

    p.x = Math.round((t.x - dx * l) * 10000) / 10000
    p.y = Math.round((t.y - dy * l) * 10000) / 10000

    return p
  }

  const FABRIK = (st, tg, nd) => {
    const wknd = [...nd]
    const len = wknd.length - 1
    if ((tg.x - st.x) === 0 && wknd.findIndex((e) => e.x != 0) < 0) {
      if (wknd.findIndex((e) => e.z != 0) < 0) {
        wknd[1].z = 0.01
      }
      for (let i = 0; i < 25; i++) {
        wknd[len].x = tg.x
        wknd[len].y = tg.y
        wknd[len].z = tg.z
        for (let j = 1; j <= len; j++) {
          wknd[len - j] = getPoint2Dx(wknd[len - j + 1], wknd[len - j], joint_length[len - j]);
        }

        wknd[0].x = st.x
        wknd[0].y = st.y
        wknd[0].z = st.z
        for (let j = 1; j <= len; j++) {
          wknd[j] = getPoint2Dx(wknd[j - 1], wknd[j], joint_length[j - 1]);
        }
      }
    } else
      if ((tg.z - st.z) === 0 && wknd.findIndex((e) => e.z != 0) < 0) {
        for (let i = 0; i < 25; i++) {
          wknd[len].x = tg.x
          wknd[len].y = tg.y
          wknd[len].z = tg.z
          for (let j = 1; j <= len; j++) {
            wknd[len - j] = getPoint2Dz(wknd[len - j + 1], wknd[len - j], joint_length[len - j]);
          }

          wknd[0].x = st.x
          wknd[0].y = st.y
          wknd[0].z = st.z
          for (let j = 1; j <= len; j++) {
            wknd[j] = getPoint2Dz(wknd[j - 1], wknd[j], joint_length[j - 1]);
          }
        }
      } else {
        for (let i = 0; i < 25; i++) {
          wknd[len].x = tg.x
          wknd[len].y = tg.y
          wknd[len].z = tg.z
          for (let j = 1; j <= len; j++) {
            wknd[len - j] = getPoint(wknd[len - j + 1], wknd[len - j], joint_length[len - j]);
          }

          wknd[0].x = st.x
          wknd[0].y = st.y
          wknd[0].z = st.z
          for (let j = 1; j <= len; j++) {
            wknd[j] = getPoint(wknd[j - 1], wknd[j], joint_length[j - 1]);
          }
        }
      }
    set_nodes([...wknd])
  }

  const WRIST_IK = (st, tg, nd2) => {
    const wknd2 = [...nd2]

    let wl_node2pos = wknd2[2]
    let wk_node3pos = wknd2[3]
    const wkdistance2 = joint_length[0] + joint_length[1]
    let wkdistance3 = Math.min(wkdistance2 + joint_length[2], distance(st, tg))
    let wk_0_2_distance_diff = -1
    const { x: degree_x, y: degree_y } = degree(st, tg)

    do {
      const { a: wk_y, b: radius } = calc_side_1(wkdistance3, degree_x)
      const { a: wk_z, b: wk_x } = calc_side_1(radius, degree_y)
      wk_node3pos = pos_add(st, { x: wk_x, y: wk_y, z: wk_z })

      const { a: teihen, b: takasa } = calc_side_1(joint_length[2], wrist_rotate.x)
      wl_node2pos = { ...wk_node3pos }
      const { a: teihen2, b: takasa2 } = calc_side_1(teihen, degree_y)
      wl_node2pos.x = wk_node3pos.x - takasa2
      wl_node2pos.y = wl_node2pos.y + (-takasa)
      wl_node2pos.z = wk_node3pos.z - teihen2

      const side_c = distance({ x: 0, y: wl_node2pos.y, z: 0 }, wl_node2pos) + teihen
      const side_b = teihen
      const { a: wk_teihen, b: wk_takasa } = calc_side_1(side_b, wrist_rotate.y)

      let angle_Ad = Math.acos(wk_takasa / side_c) * 180 / Math.PI
      if (isNaN(angle_Ad)) angle_Ad = 0

      const { b: wk_takasa2 } = calc_side_1(side_c, angle_Ad)
      const side_a = wk_takasa2 - wk_teihen

      let angle_A = Math.acos((side_b ** 2 + side_c ** 2 - side_a ** 2) / (2 * side_b * side_c)) * 180 / Math.PI
      if (isNaN(angle_A)) angle_A = 0
      angle_A = angle_A * (wrist_rotate.y < 0 ? -1 : 1)

      const { a: teihen3, b: takasa3 } = calc_side_1(teihen, (degree_y + angle_A))
      wl_node2pos.x = wk_node3pos.x - takasa3
      wl_node2pos.z = wk_node3pos.z - teihen3

      wk_0_2_distance_diff = wkdistance2 - distance(st, wl_node2pos)
      wkdistance3 = wkdistance3 + wk_0_2_distance_diff
    } while (wk_0_2_distance_diff < 0)

    set_node1(wk_node3pos)
    set_node2(wl_node2pos)

    wknd2[1] = wknd2[0]
    wknd2[2] = wl_node2pos
    wknd2[3] = wk_node3pos

    set_nodes([...wknd2])
  }

  React.useEffect(() => {
    const setNode = []
    setNode.push(pos_add(joint_pos.j1, joint_pos.j2))
    setNode.push(pos_add(setNode[0], joint_pos.j3))
    setNode.push(pos_add(pos_add(setNode[1], joint_pos.j4), joint_pos.j5))
    setNode.push(pos_add(pos_add(pos_add(setNode[2], joint_pos.j6), joint_pos.j7), joint_pos.j8))
    set_nodes(setNode)

    set_source(setNode[0])

    set_joint_length([
      distance(setNode[0], setNode[1]),
      distance(setNode[1], setNode[2]),
      distance(setNode[2], setNode[3]),
      0,
    ])

  }, [])

  React.useEffect(() => {
    if (nodes.length > 0 && fabrik_mode) {
      FABRIK(source, target, nodes)
    }
    if (nodes.length > 0 && !fabrik_mode) {
      WRIST_IK(source, target, nodes)
    }
  }, [target, wrist_rotate])

  const degree_base = (s_pos, t_pos, side_a, side_b) => {
    const side_c = distance(s_pos, t_pos)
    const diff_x = (t_pos.x + 10) - (s_pos.x + 10)
    const diff_y = (t_pos.y + 10) - (s_pos.y + 10)
    const diff_z = (t_pos.z + 10) - (s_pos.z + 10)
    let angle_base = Math.atan2(Math.sqrt(side_c ** 2 - diff_y ** 2), diff_y) * 180 / Math.PI
    let direction = Math.atan2(diff_x, diff_z) * 180 / Math.PI
    if (isNaN(angle_base)) angle_base = 0
    if (isNaN(direction)) direction = 0

    let angle_B = Math.acos((side_a ** 2 + side_c ** 2 - side_b ** 2) / (2 * side_a * side_c)) * 180 / Math.PI
    let angle_C = Math.acos((side_a ** 2 + side_b ** 2 - side_c ** 2) / (2 * side_a * side_b)) * 180 / Math.PI

    if (isNaN(angle_B)) angle_B = 0
    if (isNaN(angle_C)) angle_C = 0

    const angle1 = angle_base - angle_B
    const angle2 = angle_C === 0 ? 0 : 180 - angle_C

    return { direction, angle_base, angle1, angle2 }
  }

  const degree = (s_pos, t_pos) => {
    const len = distance(s_pos, t_pos)
    const diff_x = (t_pos.x + 10) - (s_pos.x + 10)
    const diff_y = (t_pos.y + 10) - (s_pos.y + 10)
    const diff_z = (t_pos.z + 10) - (s_pos.z + 10)

    let degree_x = Math.atan2(Math.sqrt(len ** 2 - diff_y ** 2), diff_y) * 180 / Math.PI
    let degree_y = Math.atan2(diff_x, diff_z) * 180 / Math.PI

    if (isNaN(degree_x)) degree_x = 0
    if (isNaN(degree_y)) degree_y = 0

    return { x: degree_x, y: degree_y }
  }

  const calc_side_1 = (syahen, kakudo) => {
    const teihen = Math.abs(kakudo) === 90 ? 0 : (syahen * Math.cos(kakudo / 180 * Math.PI))
    const takasa = Math.abs(kakudo) === 180 ? 0 : (syahen * Math.sin(kakudo / 180 * Math.PI))
    return { a: teihen, b: takasa }
  }

  const calc_side_2 = (teihen, takasa) => {
    const syahen = Math.sqrt(teihen ** 2 + takasa ** 2)
    const kakudo = Math.atan2(teihen, takasa) * 180 / Math.PI
    return { s: syahen, k: kakudo }
  }

  const calc_side_3 = (hen_a, hen_b, kakudo) => {
    return Math.sqrt(hen_a ** 2 + hen_b ** 2 - (2 * hen_a * hen_b * Math.cos(kakudo / 180 * Math.PI)))
  }

  React.useEffect(() => {
    if (nodes.length > 0) {
      const wkrotate = { ...rotate }
      const deg1 = degree_base(nodes[0], nodes[2], joint_length[0], joint_length[1])
      const { a: node1y, b: node1r } = calc_side_1(joint_length[0], deg1.angle1)
      const node1x = Math.abs(deg1.direction) === 180 ? 0 : (node1r * Math.sin(deg1.direction / 180 * Math.PI))
      const node1z = Math.abs(deg1.direction) === 90 ? 0 : (node1r * Math.cos(deg1.direction / 180 * Math.PI))
      const node1pos = pos_add(joint_pos.j2, { x: node1x, y: node1y, z: node1z })

      const second_base_pos = nodes[2]
      const { x: degree_x, y: degree_y } = degree(node1pos, second_base_pos)
      const relativepos = pos_sub(nodes[3], second_base_pos)
      const { s: hankei, k: kakudo } = calc_side_2(relativepos.x, relativepos.z)
      const relativedeg = kakudo - degree_y
      const wkpos1x = hankei * Math.sin(relativedeg / 180 * Math.PI)
      const wkpos1z = hankei * Math.cos(relativedeg / 180 * Math.PI)
      const wkpos1 = { x: wkpos1x, y: relativepos.y, z: wkpos1z }

      const { s: hankei2, k: kakudo2 } = calc_side_2(wkpos1z, relativepos.y)
      const relativedeg2 = kakudo2 - degree_x
      const wkpos2z = hankei2 * Math.sin(relativedeg2 / 180 * Math.PI)
      const wkpos2y = hankei2 * Math.cos(relativedeg2 / 180 * Math.PI)

      const wkpos2 = { x: wkpos1x, y: wkpos2y, z: wkpos2z }
      const { x: wkpos1_deg_x, y: wkpos1_deg_y } = degree({ x: 0, y: 0, z: 0 }, wkpos2)
      set_node1(pos_add(second_base_pos, wkpos1))
      set_node2(pos_add(second_base_pos, wkpos2))

      let setj4 = wkpos1_deg_y
      if ((deg1.angle1 + deg1.angle2) >= 180) {
        if (setj4 < 0) {
          setj4 += 180
        } else {
          setj4 -= 180
        }
      }
      wkrotate.j1 = deg1.direction
      wkrotate.j2 = deg1.angle1
      wkrotate.j3 = deg1.angle2
      wkrotate.j4 = (setj4)
      wkrotate.j5 = (wkpos1_deg_x)
      wkrotate.j6 = wrist_rotate.z

      set_rotate({ ...wkrotate })
    }
  }, [nodes, wrist_rotate, fabrik_mode])

  const robotChange = () => {
    const get = (robotName) => {
      let changeIdx = robotNameList.findIndex((e) => e === robotName) + 1
      if (changeIdx >= robotNameList.length) {
        changeIdx = 0
      }
      return robotNameList[changeIdx]
    }
    set_robotName(get)
  }

  const setKinovaJoints = (payload) => {
    //    console.log("Payload", payload)
    set_rotate({
      j1: 180 - payload[0],
      j2: payload[1] - 180,
      j3: 180 - payload[2],
      j4: 180 - payload[3],
      j5: 180 - payload[4],
      j6: -payload[5]
    })
  }

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      require("aframe");
      setTimeout(set_rendered(true), 1000)
      console.log('set_rendered')

      if (!registered) {
        registered = true
        AFRAME.registerComponent('robot-click', {
          init: function () {
            this.el.addEventListener('click', (evt) => {
              robotChange()
              console.log('robot-click')
            });
          }
        });

        console.log("Connecting MQTT");
        connectMQTT(() => subscribe("kinova/real", setKinovaJoints));

      }
    }
  }, [typeof window])

  const controllerProps = {
    robotName, robotNameList, set_robotName,
    rotate, set_rotate, target, set_target,
    wrist_rotate, set_wrist_rotate,
    fabrik_mode, set_fabrik_mode
  }

  const edit_pos = (posxyz) => `${posxyz.x} ${posxyz.y} ${posxyz.z}`

  const robotProps = {
    robotNameList, robotName, rotate, joint_pos, edit_pos
  }

  const aboxprops = {
    nodes, box_scale, box_visible, edit_pos
  }

  if (rendered) {
    return (
      <>
        <a-scene>
          <a-sky color="#E2F4FF"></a-sky>
          <Abox {...aboxprops} />
          <a-cone position={edit_pos(node1)} scale={box_scale} color="red" visible={box_visible}></a-cone>
          <a-cone position={edit_pos(node2)} scale={box_scale} color="cyan" visible={box_visible}></a-cone>
          <a-plane position="0 0 0" rotation="-90 0 0" width="1" height="1" color="#7BC8A4" shadow></a-plane>
          <Assets />
          <Select_Robot {...robotProps} />
          <a-entity id="rig" position={edit_pos(c_pos)} rotation={`${c_deg.x} ${c_deg.y} ${c_deg.z}`}>
            <a-camera id="camera" cursor="rayOrigin: mouse;" position="0 0 0"></a-camera>
          </a-entity>
          <a-sphere position={edit_pos(target)} scale="0.02 0.02 0.02" color="yellow" visible={true}></a-sphere>
        </a-scene>
        <Controller {...controllerProps} />
      </>
    );
  } else {
    return (
      <a-scene>
        <Assets />
      </a-scene>
    )
  }
}

const Abox = (props) => {
  const { nodes, box_scale, box_visible, edit_pos } = props
  const coltbl = ["red", "green", "blue", "yellow"]
  if (nodes.length > 0) {
    return nodes.map((node, idx) => <a-box key={idx} position={edit_pos(node)} scale={box_scale} color={coltbl[idx]} visible={box_visible}></a-box>)
  } else {
    return null
  }
}

const Assets = () => {
  return (
    <a-assets>
      {/*KINOVA Gen2*/}
      <a-asset-items id="KINOVA_BASE" src="KINOVA_Gen2_base.gltf" ></a-asset-items>
      <a-asset-items id="KINOVA_J1" src="KINOVA_Gen2_j1.gltf" ></a-asset-items>
      <a-asset-items id="KINOVA_J2" src="KINOVA_Gen2_j2.gltf" ></a-asset-items>
      <a-asset-items id="KINOVA_J3" src="KINOVA_Gen2_j3.gltf" ></a-asset-items>
      <a-asset-items id="KINOVA_J4" src="KINOVA_Gen2_j4.gltf" ></a-asset-items>
      <a-asset-items id="KINOVA_J5" src="KINOVA_Gen2_j5.gltf" ></a-asset-items>
      <a-asset-items id="KINOVA_J6" src="KINOVA_Gen2_j6.gltf" ></a-asset-items>
      <a-asset-items id="KINOVA_finger1" src="KINOVA_Gen2_finger.gltf" ></a-asset-items>
      <a-asset-items id="KINOVA_finger2" src="KINOVA_Gen2_finger2.gltf" ></a-asset-items>
    </a-assets>
  )
}

const KINOVA_Gen2 = (props) => {
  const { visible, rotate, joint_pos, edit_pos } = props
  return (<>{visible ?
    <a-entity robot-click gltf-model="#KINOVA_BASE" position={edit_pos(joint_pos.base)} rotation="0 0 0" visible={visible}>
      <a-entity gltf-model="#KINOVA_J1" position={edit_pos(joint_pos.j1)} rotation={`0 ${rotate.j1} 0`}>
        <a-entity gltf-model="#KINOVA_J2" position={edit_pos(joint_pos.j2)} rotation={`${rotate.j2} 0 0`}>
          <a-entity gltf-model="#KINOVA_J3" position={edit_pos(joint_pos.j3)} rotation={`${rotate.j3} 0 0`}>
            <a-entity gltf-model="#KINOVA_J4" position={edit_pos(joint_pos.j4)} rotation={`0 ${rotate.j4} 0`}>
              <a-entity gltf-model="#KINOVA_J5" position={edit_pos(joint_pos.j5)} rotation={`${rotate.j5} 0 0`}>
                <a-entity gltf-model="#KINOVA_J6" position={edit_pos(joint_pos.j6)} rotation={`0 ${rotate.j6} 0`}>
                  <a-entity gltf-model="#KINOVA_finger1" position="-0.03 0.1145 0.003" rotation="8 -10 0" animation="property: rotation; from: 8 -10 0; to: 8 -10 -40; loop: true; dur:1000; easing:linear"></a-entity>
                  <a-entity gltf-model="#KINOVA_finger2" position="0.025 0.1145 -0.023" rotation="-1 7 0" animation="property: rotation; from: -1 7 0; to: -1 7 40; loop: true; dur:1000; easing:linear"></a-entity>
                  <a-entity gltf-model="#KINOVA_finger2" position="0.025 0.1145 0.022" rotation="2 -15 0" animation="property: rotation; from: 2 -15 0; to: 2 -15 40; loop: true; dur:1000; easing:linear"></a-entity>
                </a-entity>
              </a-entity>
            </a-entity>
          </a-entity>
        </a-entity>
      </a-entity>
    </a-entity> : null}</>
  )
}

const Select_Robot = (props) => {
  const { robotNameList, robotName, ...rotateProps } = props
  const visibletable = robotNameList.map(() => false)
  // const robotNameList = ["DOBOT Nova 2","Cobotta PRO 900","JAKA Zu 5"]
  const findindex = robotNameList.findIndex((e) => e === robotName)
  if (findindex >= 0) {
    visibletable[findindex] = true
  }
  return (<>
    <KINOVA_Gen2 visible={visibletable[0]} {...rotateProps} />
  </>)
}









