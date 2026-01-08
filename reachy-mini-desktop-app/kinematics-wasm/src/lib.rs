//! # Reachy Mini Kinematics WASM
//!
//! WebAssembly module for calculating passive joints of the Stewart platform.
//!
//! ## Background
//! The Reachy Mini robot has a Stewart platform (parallel robot) for head movement.
//! The platform has 6 active joints (stewart_1 to stewart_6) and 21 passive joints
//! (7 ball joints × 3 DOF each: x, y, z rotation).
//!
//! The daemon with AnalyticalKinematics doesn't calculate passive joints.
//! This WASM module fills that gap by computing them from:
//! - `head_joints`: [yaw_body, stewart_1, ..., stewart_6] (7 floats)
//! - `head_pose`: 4×4 transformation matrix (16 floats, row-major)
//!
//! ## Algorithm
//! Ported from Python `AnalyticalKinematics.calculate_passive_joints()`.
//!
//! For each Stewart motor (1-6):
//! 1. Calculate branch position on platform (world frame)
//! 2. Calculate servo arm tip position (world frame)
//! 3. Compute vector from servo to branch
//! 4. Align rod direction with this vector
//! 5. Extract Euler angles (XYZ extrinsic)
//!
//! The 7th passive joint is computed for the XL330 (head connector).
//!
//! ## Euler Conventions
//! - Creation: `R.from_euler('xyz')` = intrinsic (Z × Y × X matrix order)
//! - Extraction: `R.as_euler('XYZ')` = extrinsic (standard XYZ)

use nalgebra::{Matrix3, Matrix4, Vector3};
use wasm_bindgen::prelude::*;

/// Head Z offset (from kinematics_data.json)
const HEAD_Z_OFFSET: f64 = 0.177;

/// Motor arm length (from kinematics_data.json)
const MOTOR_ARM_LENGTH: f64 = 0.04;

/// XL330 frame pose in head frame (from URDF)
const T_HEAD_XL_330: [[f64; 4]; 4] = [
    [0.4822, -0.7068, -0.5177, 0.0206],
    [0.1766, -0.5003, 0.8476, -0.0218],
    [-0.8581, -0.5001, -0.1164, 0.0],
    [0.0, 0.0, 0.0, 1.0],
];

/// Passive joint orientation offsets (from URDF)
const PASSIVE_ORIENTATION_OFFSET: [[f64; 3]; 7] = [
    [-0.13754, -0.0882156, 2.10349],
    [-std::f64::consts::PI, 5.37396e-16, -std::f64::consts::PI],
    [0.373569, 0.0882156, -1.0381],
    [-0.0860846, 0.0882156, 1.0381],
    [0.123977, 0.0882156, -1.0381],
    [3.0613, 0.0882156, 1.0381],
    [std::f64::consts::PI, 2.10388e-17, 4.15523e-17],
];

/// Stewart rod direction in passive frame (from URDF)
const STEWART_ROD_DIR_IN_PASSIVE_FRAME: [[f64; 3]; 6] = [
    [1.0, 0.0, 0.0],
    [0.50606941, -0.85796418, -0.08826792],
    [-1.0, 0.0, 0.0],
    [-1.0, 0.0, 0.0],
    [-1.0, 0.0, 0.0],
    [-1.0, 0.0, 0.0],
];

/// Motor data from kinematics_data.json
struct Motor {
    branch_position: [f64; 3],
    t_world_motor: [[f64; 4]; 4],
}

/// Get motor data (from kinematics_data.json - T_world_motor = inv(T_motor_world))
/// These matrices are computed by Python: np.linalg.inv(T_motor_world)
fn get_motors() -> Vec<Motor> {
    vec![
        // stewart_1
        Motor {
            branch_position: [0.020648178337122566, 0.021763723638894568, 1.0345743467476964e-07],
            t_world_motor: [
                [0.8660247915798899, 0.0000044901959360, -0.5000010603477224, 0.0269905781109381],
                [-0.5000010603626028, 0.0000031810770988, -0.8660247915770969, 0.0267489144601032],
                [-0.0000022980790772, 0.9999999999848599, 0.0000049999943606, 0.0766332540902687],
                [0.0, 0.0, 0.0, 1.0],
            ],
        },
        // stewart_2
        Motor {
            branch_position: [0.00852381571767217, 0.028763668526131346, 1.183437210727778e-07],
            t_world_motor: [
                [-0.8660211183436273, -0.0000044902196459, -0.5000074225075980, 0.0096699703080478],
                [0.5000074225224782, -0.0000031810634097, -0.8660211183408341, 0.0367490037948058],
                [0.0000022980697230, -0.9999999999848597, 0.0000050000112432, 0.0766333000521544],
                [0.0, 0.0, 0.0, 1.0],
            ],
        },
        // stewart_3
        Motor {
            branch_position: [-0.029172011376922807, 0.0069999429399361995, 4.0290270064691214e-08],
            t_world_motor: [
                [0.0000063267948970, -0.0000010196153098, 0.9999999999794665, -0.0366606982562266],
                [0.9999999999799865, 0.0000000000135060, -0.0000063267948965, 0.0100001160862987],
                [-0.0000000000070551, 0.9999999999994809, 0.0000010196153103, 0.0766334229944826],
                [0.0, 0.0, 0.0, 1.0],
            ],
        },
        // stewart_4
        Motor {
            branch_position: [-0.029172040355214434, -0.0069999960097160766, -3.1608172912367394e-08],
            t_world_motor: [
                [-0.0000036732050704, 0.0000010196153103, 0.9999999999927344, -0.0366607717202358],
                [-0.9999999999932538, -0.0000000000036776, -0.0000036732050700, -0.0099998653384376],
                [-0.0000000000000677, -0.9999999999994809, 0.0000010196153103, 0.0766334229944823],
                [0.0, 0.0, 0.0, 1.0],
            ],
        },
        // stewart_5
        Motor {
            branch_position: [0.008523809101930114, -0.028763713010385224, -1.4344916837716326e-07],
            t_world_motor: [
                [-0.8660284647694136, 0.0000044901728834, -0.4999946981608615, 0.0096697448698383],
                [-0.4999946981757425, -0.0000031811099295, 0.8660284647666202, -0.0367490491228644],
                [0.0000022980794298, 0.9999999999848597, 0.0000049999943840, 0.0766333000520353],
                [0.0, 0.0, 0.0, 1.0],
            ],
        },
        // stewart_6
        Motor {
            branch_position: [0.020648186722822436, -0.02176369606185343, -8.957920105689965e-08],
            t_world_motor: [
                [0.8660247915798903, -0.0000044901962204, -0.5000010603477218, 0.0269903370664035],
                [0.5000010603626028, 0.0000031810964559, 0.8660247915770964, -0.0267491384573748],
                [-0.0000022980696448, -0.9999999999848597, 0.0000050000112666, 0.0766332540903862],
                [0.0, 0.0, 0.0, 1.0],
            ],
        },
    ]
}

/// Create rotation matrix from euler angles (xyz intrinsic = Z * Y * X matrix order)
/// This matches scipy's R.from_euler('xyz', angles)
fn rotation_from_euler_xyz(x: f64, y: f64, z: f64) -> Matrix3<f64> {
    let cx = x.cos();
    let sx = x.sin();
    let cy = y.cos();
    let sy = y.sin();
    let cz = z.cos();
    let sz = z.sin();

    // Intrinsic xyz = Rz * Ry * Rx (matrix multiplication order)
    // Result[i,j] = sum over k of Rz[i,k] * (Ry * Rx)[k,j]
    Matrix3::new(
        cy * cz,
        cz * sx * sy - cx * sz,
        cx * cz * sy + sx * sz,
        cy * sz,
        cx * cz + sx * sy * sz,
        cx * sy * sz - cz * sx,
        -sy,
        cy * sx,
        cx * cy,
    )
}

/// Extract euler angles (XYZ order) from rotation matrix
fn euler_from_rotation_xyz(r: &Matrix3<f64>) -> [f64; 3] {
    let sy = r[(0, 2)];

    if sy.abs() < 0.99999 {
        let x = (-r[(1, 2)]).atan2(r[(2, 2)]);
        let y = sy.asin();
        let z = (-r[(0, 1)]).atan2(r[(0, 0)]);
        [x, y, z]
    } else {
        // Gimbal lock
        let x = r[(2, 1)].atan2(r[(1, 1)]);
        let y = if sy > 0.0 {
            std::f64::consts::FRAC_PI_2
        } else {
            -std::f64::consts::FRAC_PI_2
        };
        let z = 0.0;
        [x, y, z]
    }
}

/// Align vectors: find rotation that aligns 'from' to 'to'
/// Similar to scipy.spatial.transform.Rotation.align_vectors
fn align_vectors(from: &Vector3<f64>, to: &Vector3<f64>) -> Matrix3<f64> {
    let from_n = from.normalize();
    let to_n = to.normalize();

    let dot = from_n.dot(&to_n);

    // If vectors are nearly parallel
    if dot > 0.99999 {
        return Matrix3::identity();
    }

    // If vectors are nearly opposite
    if dot < -0.99999 {
        // Find a perpendicular axis
        let mut perp = Vector3::new(1.0, 0.0, 0.0).cross(&from_n);
        if perp.norm() < 0.001 {
            perp = Vector3::new(0.0, 1.0, 0.0).cross(&from_n);
        }
        let axis = perp.normalize();
        // Rotate 180 degrees around perpendicular axis
        let k = Matrix3::new(
            0.0, -axis.z, axis.y, axis.z, 0.0, -axis.x, -axis.y, axis.x, 0.0,
        );
        return Matrix3::identity() + 2.0 * k * k;
    }

    // General case: Rodrigues' rotation formula
    let cross = from_n.cross(&to_n);
    let s = cross.norm();
    let c = dot;

    let k = Matrix3::new(
        0.0, -cross.z, cross.y, cross.z, 0.0, -cross.x, -cross.y, cross.x, 0.0,
    );

    Matrix3::identity() + k + k * k * ((1.0 - c) / (s * s))
}

/// Calculate passive joint angles from head joints and head pose
///
/// # Arguments
/// * `head_joints` - Array of 7 floats: [yaw_body, stewart_1, ..., stewart_6]
/// * `head_pose` - 4x4 transformation matrix as 16 floats (row-major)
///
/// # Returns
/// Array of 21 floats: passive joint angles [p1_x, p1_y, p1_z, ..., p7_x, p7_y, p7_z]
#[wasm_bindgen]
pub fn calculate_passive_joints(head_joints: &[f64], head_pose: &[f64]) -> Vec<f64> {
    if head_joints.len() < 7 || head_pose.len() < 16 {
        return vec![0.0; 21];
    }

    let body_yaw = head_joints[0];
    let motors = get_motors();

    // Build head pose matrix from row-major input
    let mut pose = Matrix4::new(
        head_pose[0],
        head_pose[1],
        head_pose[2],
        head_pose[3],
        head_pose[4],
        head_pose[5],
        head_pose[6],
        head_pose[7],
        head_pose[8],
        head_pose[9],
        head_pose[10],
        head_pose[11],
        head_pose[12],
        head_pose[13],
        head_pose[14],
        head_pose[15],
    );

    // Add head Z offset
    pose[(2, 3)] += HEAD_Z_OFFSET;

    // Inverse rotation: rotate pose around Z by -body_yaw
    let cos_yaw = body_yaw.cos();
    let sin_yaw = body_yaw.sin();
    let r_z_inv = Matrix4::new(
        cos_yaw, sin_yaw, 0.0, 0.0, -sin_yaw, cos_yaw, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0,
        1.0,
    );
    pose = r_z_inv * pose;

    // Pre-compute passive correction rotations
    let passive_corrections: Vec<Matrix3<f64>> = PASSIVE_ORIENTATION_OFFSET
        .iter()
        .map(|offset| rotation_from_euler_xyz(offset[0], offset[1], offset[2]))
        .collect();

    let mut passive_joints = vec![0.0; 21];
    let mut last_r_servo_branch = Matrix3::identity();
    let mut last_r_world_servo = Matrix3::identity();

    // T_motor_servo_arm: translation by motor_arm_length along X
    let t_motor_servo_arm = Vector3::new(MOTOR_ARM_LENGTH, 0.0, 0.0);

    // For each of the 6 stewart motors
    for (i, motor) in motors.iter().enumerate() {
        let stewart_joint = head_joints[i + 1];

        // Extract pose rotation and translation
        let pose_rot = pose.fixed_view::<3, 3>(0, 0).into_owned();
        let pose_trans = Vector3::new(pose[(0, 3)], pose[(1, 3)], pose[(2, 3)]);

        // Calculate branch position on platform in world frame
        let branch_pos = Vector3::new(
            motor.branch_position[0],
            motor.branch_position[1],
            motor.branch_position[2],
        );
        let branch_pos_world = pose_rot * branch_pos + pose_trans;

        // Compute servo rotation (rotating around Z axis)
        let cos_z = stewart_joint.cos();
        let sin_z = stewart_joint.sin();
        let r_servo = Matrix3::new(cos_z, -sin_z, 0.0, sin_z, cos_z, 0.0, 0.0, 0.0, 1.0);

        // T_world_motor from motor data
        let t_world_motor = Matrix4::new(
            motor.t_world_motor[0][0],
            motor.t_world_motor[0][1],
            motor.t_world_motor[0][2],
            motor.t_world_motor[0][3],
            motor.t_world_motor[1][0],
            motor.t_world_motor[1][1],
            motor.t_world_motor[1][2],
            motor.t_world_motor[1][3],
            motor.t_world_motor[2][0],
            motor.t_world_motor[2][1],
            motor.t_world_motor[2][2],
            motor.t_world_motor[2][3],
            motor.t_world_motor[3][0],
            motor.t_world_motor[3][1],
            motor.t_world_motor[3][2],
            motor.t_world_motor[3][3],
        );
        let t_world_motor_rot = t_world_motor.fixed_view::<3, 3>(0, 0).into_owned();
        let t_world_motor_trans = Vector3::new(
            t_world_motor[(0, 3)],
            t_world_motor[(1, 3)],
            t_world_motor[(2, 3)],
        );

        // Compute world servo arm position
        let servo_pos_local = r_servo * t_motor_servo_arm;
        let p_world_servo_arm = t_world_motor_rot * servo_pos_local + t_world_motor_trans;

        // Apply passive correction to orientation
        let r_world_servo = t_world_motor_rot * r_servo * passive_corrections[i];

        // Vector from servo arm to branch in world frame
        let vec_servo_to_branch = branch_pos_world - p_world_servo_arm;

        // Transform to servo frame (use transpose for inverse of rotation)
        let vec_servo_to_branch_in_servo = r_world_servo.transpose() * vec_servo_to_branch;

        // Rod direction in passive frame
        let rod_dir = Vector3::new(
            STEWART_ROD_DIR_IN_PASSIVE_FRAME[i][0],
            STEWART_ROD_DIR_IN_PASSIVE_FRAME[i][1],
            STEWART_ROD_DIR_IN_PASSIVE_FRAME[i][2],
        );

        // Normalize and get straight line direction
        let norm_vec = vec_servo_to_branch_in_servo.norm();
        let straight_line_dir = vec_servo_to_branch_in_servo / norm_vec;

        // Align rod direction to actual direction
        let r_servo_branch = align_vectors(&rod_dir, &straight_line_dir);
        let euler = euler_from_rotation_xyz(&r_servo_branch);

        passive_joints[i * 3] = euler[0];
        passive_joints[i * 3 + 1] = euler[1];
        passive_joints[i * 3 + 2] = euler[2];

        // Save for 7th passive joint calculation
        if i == 5 {
            last_r_servo_branch = r_servo_branch;
            last_r_world_servo = r_world_servo;
        }
    }

    // 7th passive joint (XL330 on the head)
    // Head XL330 target orientation
    let t_head_xl330_rot = Matrix3::new(
        T_HEAD_XL_330[0][0],
        T_HEAD_XL_330[0][1],
        T_HEAD_XL_330[0][2],
        T_HEAD_XL_330[1][0],
        T_HEAD_XL_330[1][1],
        T_HEAD_XL_330[1][2],
        T_HEAD_XL_330[2][0],
        T_HEAD_XL_330[2][1],
        T_HEAD_XL_330[2][2],
    );
    let pose_rot = pose.fixed_view::<3, 3>(0, 0).into_owned();
    let r_head_xl330 = pose_rot * t_head_xl330_rot;

    // Current rod orientation with correction for 7th passive joint
    let r_rod_current = last_r_world_servo * last_r_servo_branch * passive_corrections[6];

    // Compute relative rotation
    let r_dof = r_rod_current.transpose() * r_head_xl330;
    let euler_7 = euler_from_rotation_xyz(&r_dof);

    passive_joints[18] = euler_7[0];
    passive_joints[19] = euler_7[1];
    passive_joints[20] = euler_7[2];

    passive_joints
}

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    // Could add console_error_panic_hook here for better error messages
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identity_pose_zero_joints() {
        // Test: Identity pose, zero joints
        let head_joints = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
        let head_pose = [
            1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
        ];
        let expected = [
            0.0022508907, 0.0362949623, -0.1238610683, -0.0222426253, 0.0013675279, -0.1273488284,
            -0.0036008297, -0.0641988484, -0.1120216899, 0.0018793787, -0.0298951753, 0.1255567074,
            -0.0021551464, -0.0346164750, -0.1243428060, 0.0018360718, 0.0291668900, -0.1257263345,
            0.0018226962, 0.0291985444, -0.1257131448,
        ];

        let result = calculate_passive_joints(&head_joints, &head_pose);
        assert_eq!(result.len(), 21);

        let tolerance = 0.01; // Allow 1% error
        for i in 0..21 {
            let diff = (result[i] - expected[i]).abs();
            assert!(
                diff < tolerance,
                "Mismatch at index {}: got {}, expected {}, diff {}",
                i,
                result[i],
                expected[i],
                diff
            );
        }
    }

    #[test]
    fn test_small_body_yaw() {
        // Test: Small body yaw
        let head_joints = [0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
        let head_pose = [
            1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
        ];
        let expected = [
            0.0023094851, 0.0309104488, -0.1491418088, -0.0265536010, -0.0035773668, -0.1030629683,
            -0.0044785419, -0.0648270895, -0.1379017245, 0.0017013496, -0.0337621624, 0.1006896894,
            -0.0021646104, -0.0288928516, -0.1495473876, 0.0016750546, 0.0331768126, -0.1008825400,
            0.0920552079, 0.0746590292, -0.0940957704,
        ];

        let result = calculate_passive_joints(&head_joints, &head_pose);
        assert_eq!(result.len(), 21);

        let tolerance = 0.01;
        for i in 0..21 {
            let diff = (result[i] - expected[i]).abs();
            assert!(
                diff < tolerance,
                "Mismatch at index {}: got {}, expected {}, diff {}",
                i,
                result[i],
                expected[i],
                diff
            );
        }
    }

    #[test]
    fn test_all_stewart_joints() {
        // Test: All stewart joints at 0.5
        let head_joints = [0.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
        let head_pose = [
            1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
        ];
        let expected = [
            0.0201470224, 0.0664757285, -0.5883623150, -0.0050969762, -0.0349257327, 0.2740303711,
            -0.0565607056, -0.1953238381, -0.5621706414, -0.0002505518, -0.0018002749,
            -0.2765717423, -0.0178861002, -0.0589442498, -0.5890751964, -0.0004703285, 0.0033795988,
            0.2765574117, 0.0420138661, 0.0441513789, -0.2210345269,
        ];

        let result = calculate_passive_joints(&head_joints, &head_pose);
        assert_eq!(result.len(), 21);

        let tolerance = 0.01;
        for i in 0..21 {
            let diff = (result[i] - expected[i]).abs();
            assert!(
                diff < tolerance,
                "Mismatch at index {}: got {}, expected {}, diff {}",
                i,
                result[i],
                expected[i],
                diff
            );
        }
    }
}
