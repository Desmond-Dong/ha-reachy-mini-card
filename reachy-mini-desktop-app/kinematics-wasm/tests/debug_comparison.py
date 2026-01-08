#!/usr/bin/env python3
"""
Debug script to understand step-by-step calculation of passive joints.
"""

import json
import numpy as np
from scipy.spatial.transform import Rotation as R

# Constants
HEAD_Z_OFFSET = 0.177
MOTOR_ARM_LENGTH = 0.04

PASSIVE_ORIENTATION_OFFSET = [
    [-0.13754,-0.0882156, 2.10349],    
    [-np.pi, 5.37396e-16, -np.pi],
    [0.373569, 0.0882156, -1.0381], 
    [-0.0860846, 0.0882156, 1.0381],
    [0.123977, 0.0882156, -1.0381],
    [3.0613, 0.0882156, 1.0381],
    [np.pi, 2.10388e-17, 4.15523e-17]
]

STEWART_ROD_DIR_IN_PASSIVE_FRAME = np.array([
    [1, 0, 0],
    [ 0.50606941, -0.85796418, -0.08826792],
    [-1, 0, 0],
    [-1, 0, 0],
    [-1, 0, 0],
    [-1, 0, 0]]
)

def load_kinematics_data():
    data_path = '/Users/thibaudfrere/Documents/work-projects/huggingface/reachy-mini/standalone-app/reachy_mini/src/reachy_mini/assets/kinematics_data.json'
    with open(data_path) as f:
        return json.load(f)

def debug_passive_joint_calculation():
    data = load_kinematics_data()
    motors = data["motors"]
    
    # Pre-compute passive corrections
    passive_corrections = [R.from_euler("xyz", offset).as_matrix() for offset in PASSIVE_ORIENTATION_OFFSET]
    
    # Test case: identity pose, zero joints
    joints = np.array([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
    T_head = np.eye(4)
    
    _pose = T_head.copy()
    _pose[:3, 3][2] += HEAD_Z_OFFSET
    
    print("=== STEP BY STEP DEBUG ===")
    print(f"\nInitial pose (after adding HEAD_Z_OFFSET):")
    print(_pose)
    
    # Inverse rotation
    cos_yaw = np.cos(joints[0])
    sin_yaw = np.sin(joints[0])
    R_z = np.array([[cos_yaw, -sin_yaw, 0.0], [sin_yaw, cos_yaw, 0.0], [0.0, 0.0, 1.0]])
    R_z_inv_4x4 = np.block([[R_z.T, np.zeros((3, 1))], [0.0, 0.0, 0.0, 1.0]])
    print(f"\nR_z_inv (R_z.T for body_yaw={joints[0]}):")
    print(R_z_inv_4x4)
    
    _pose = R_z_inv_4x4 @ _pose
    print(f"\nPose after inverse rotation:")
    print(_pose)
    
    T_motor_servo_arm = np.eye(4)
    T_motor_servo_arm[:3, 3][0] = MOTOR_ARM_LENGTH
    print(f"\nT_motor_servo_arm:")
    print(T_motor_servo_arm)
    
    # T_world_motor for each motor
    T_world_motors = []
    for motor in motors:
        T_w_motor = np.linalg.inv(np.array(motor["T_motor_world"]))
        T_world_motors.append(T_w_motor)
    
    # Calculate for first motor (stewart_1)
    i = 0
    motor = motors[i]
    print(f"\n=== MOTOR {i+1} ({motor['name']}) ===")
    
    print(f"\nbranch_position: {motor['branch_position']}")
    branch_pos_world = _pose[:3, :3] @ np.array(motor["branch_position"]) + _pose[:3, 3]
    print(f"branch_pos_world: {branch_pos_world}")
    
    cos_z = np.cos(joints[i+1])
    sin_z = np.sin(joints[i+1])
    R_servo = np.array([[cos_z, -sin_z, 0], [sin_z, cos_z, 0], [0, 0, 1]])
    print(f"\nR_servo (for stewart joint={joints[i+1]}):")
    print(R_servo)
    
    T_world_motor = T_world_motors[i]
    print(f"\nT_world_motor (inv of T_motor_world):")
    print(T_world_motor)
    
    servo_pos_local = R_servo @ T_motor_servo_arm[:3, 3]
    print(f"\nservo_pos_local: {servo_pos_local}")
    
    P_world_servo_arm = T_world_motor[:3, :3] @ servo_pos_local + T_world_motor[:3, 3]
    print(f"P_world_servo_arm: {P_world_servo_arm}")
    
    print(f"\npassive_corrections[{i}]:")
    print(passive_corrections[i])
    
    R_world_servo = T_world_motor[:3, :3] @ R_servo @ passive_corrections[i]
    print(f"\nR_world_servo:")
    print(R_world_servo)
    
    vec_servo_to_branch = branch_pos_world - P_world_servo_arm
    print(f"\nvec_servo_to_branch: {vec_servo_to_branch}")
    
    vec_servo_to_branch_in_servo = R_world_servo.T @ vec_servo_to_branch
    print(f"vec_servo_to_branch_in_servo: {vec_servo_to_branch_in_servo}")
    
    rod_dir = STEWART_ROD_DIR_IN_PASSIVE_FRAME[i]
    print(f"\nrod_dir: {rod_dir}")
    
    norm_vec = np.linalg.norm(vec_servo_to_branch_in_servo)
    print(f"norm_vec: {norm_vec}")
    
    straight_line_dir = vec_servo_to_branch_in_servo / norm_vec
    print(f"straight_line_dir: {straight_line_dir}")
    
    # This is the key function!
    R_servo_branch, _ = R.align_vectors(np.array([straight_line_dir]), np.array([rod_dir]))
    print(f"\nR_servo_branch (align rod_dir -> straight_line_dir):")
    print(R_servo_branch.as_matrix())
    
    euler = R_servo_branch.as_euler("XYZ")
    print(f"\nEuler angles (XYZ): {euler}")
    print(f"  x = {euler[0]:.10f}")
    print(f"  y = {euler[1]:.10f}")
    print(f"  z = {euler[2]:.10f}")

if __name__ == "__main__":
    debug_passive_joint_calculation()

